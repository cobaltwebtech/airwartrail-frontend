/**
 * Live Content Collections Configuration
 *
 * Fetches blog posts and pages from the CMS Worker via tRPC.
 *
 * Astro 6 + Cloudflare adapter v13 allows live loaders to run with the
 * Cloudflare Workers runtime. We use the `AWT_CMS` service binding to call
 * the CMS tRPC API directly instead of a public HTTP URL. An optional API
 * key can still be provided via environment.
 */

import { defineLiveCollection } from "astro:content";
import type { LiveLoader } from "astro/loaders";
import { z } from "astro/zod";
import type { ListPostsOutput, Post, PublishStatus } from "./lib/trpc";
import type {
	ListPagesOutput,
	Page,
	PagePublishStatus,
} from "./lib/trpc/types";

// ============================================================================
// Types
// ============================================================================

/** Filter for fetching a collection of blog posts */
interface BlogCollectionFilter {
	status?: PublishStatus;
	featuredOnly?: boolean;
	search?: string;
	limit?: number;
	page?: number;
	sortBy?: "createdAt" | "updatedAt" | "publishedAt" | "title";
	sortOrder?: "asc" | "desc";
}

/** Filter for fetching a single blog post */
interface BlogEntryFilter {
	id?: string;
	slug?: string;
}

/** Filter for fetching a collection of pages */
interface PageCollectionFilter {
	status?: PagePublishStatus;
	search?: string;
	limit?: number;
	page?: number;
	sortBy?: "createdAt" | "updatedAt" | "publishedAt" | "title";
	sortOrder?: "asc" | "desc";
}

/** Filter for fetching a single page */
interface PageEntryFilter {
	id?: string;
	slug?: string;
}

// ============================================================================
// Blog Post Schemas
// ============================================================================

/** Schema for list view - minimal fields from listFiltered procedure */
const blogListSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	shortDescription: z.string().nullable(),
	featuredImageUrl: z.string().nullable(),
	featuredImageAlt: z.string().nullable(),
	publishedAt: z.string().nullable(),
	isFeatured: z.boolean(),
	readingTimeMinutes: z.number().nullable(),
});

/** Schema for full post view - complete fields from get procedure */
const blogPostSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	shortDescription: z.string().nullable(),
	postContent: z.unknown(),
	featuredImageUrl: z.string().nullable(),
	featuredImageAlt: z.string().nullable(),
	publishStatus: z.enum(["draft", "published", "scheduled", "archived"]),
	publishedAt: z.string().nullable(),
	author: z.string(),
	authorId: z.string().nullable(),
	isFeatured: z.boolean(),
	readingTimeMinutes: z.number().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

// ============================================================================
// Page Schemas
// ============================================================================

/** Schema for list view - minimal fields from listPublished procedure */
const pageListSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	pageContent: z.unknown(),
	publishedAt: z.string().nullable(),
});

/** Schema for full page view - complete fields from get procedure */
const pageSchema = z.object({
	id: z.string(),
	slug: z.string(),
	title: z.string(),
	pageContent: z.unknown(),
	publishStatus: z.enum(["published", "unpublished"]),
	publishedAt: z.string().nullable(),
	author: z.string(),
	authorId: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

// ============================================================================
// tRPC Service Binding Client for Live Loaders
// ============================================================================

/**
 * Get the CMS service binding and optional API key from the Cloudflare env.
 * Uses dynamic import so the module can be parsed during `astro sync` without
 * requiring the workerd-only `cloudflare:workers` module.
 */
async function getCMSBinding(): Promise<{ binding: Fetcher; apiKey?: string }> {
	const { env } = await import("cloudflare:workers");
	const binding = env.AWT_CMS;
	const apiKey = env.AWT_CMS_API_KEY;

	if (!binding) {
		throw new Error(
			"AWT_CMS service binding is not available. " +
				"Make sure the binding is configured in wrangler.jsonc.",
		);
	}

	return { binding, apiKey };
}

/** Type for blog post data returned by the loader */
type BlogData = Record<string, unknown>;

/**
 * Normalize a Post to ensure dates are ISO strings for schema validation
 */
function normalizePost(post: Post): Record<string, unknown> {
	return {
		...post,
		createdAt: post.createdAt
			? typeof post.createdAt === "string"
				? post.createdAt
				: new Date(post.createdAt).toISOString()
			: undefined,
		updatedAt: post.updatedAt
			? typeof post.updatedAt === "string"
				? post.updatedAt
				: new Date(post.updatedAt).toISOString()
			: undefined,
		publishedAt: post.publishedAt
			? typeof post.publishedAt === "string"
				? post.publishedAt
				: new Date(post.publishedAt).toISOString()
			: null,
	};
}

/**
 * Make a tRPC query via the CMS service binding.
 * tRPC queries use GET with input as a query parameter.
 */
async function fetchFromCMS<T>(procedure: string, input: unknown): Promise<T> {
	const { binding, apiKey } = await getCMSBinding();

	// tRPC queries use GET with input as query parameter
	// The hostname is arbitrary — the service binding routes directly to the worker.
	const inputParam = JSON.stringify({ json: input });
	const path = `https://awt-cms-worker/trpc/${procedure}?input=${encodeURIComponent(inputParam)}`;

	const response = await binding.fetch(path, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			...(apiKey ? { "x-api-key": apiKey } : {}),
		},
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "<unreadable>");
		throw new Error(
			`CMS request failed: ${response.status} ${response.statusText} - ${errorText}`,
		);
	}

	const data = (await response.json()) as unknown;

	// Type guard for tRPC response structure
	const isTRPCResponse = (
		d: unknown,
	): d is { result?: { data?: unknown }; error?: unknown } =>
		typeof d === "object" && d !== null && !Array.isArray(d);

	// Handle successful tRPC response
	if (isTRPCResponse(data) && data.result?.data) {
		// tRPC wraps the data in a "json" property, so we need to unwrap it
		const wrappedData = data.result.data as { json?: unknown };
		const actualData = wrappedData.json ?? data.result.data;
		return actualData as T;
	}

	// Handle error response
	if (isTRPCResponse(data) && data.error) {
		throw new Error(`CMS error: ${JSON.stringify(data.error)}`);
	}

	return data as T;
}

// ============================================================================
// Blog Loader
// ============================================================================

/**
 * Live loader for blog post listings from listFiltered procedure
 * Returns minimal data for list views
 */
function blogListLoader(): LiveLoader<
	BlogData,
	BlogEntryFilter,
	BlogCollectionFilter,
	Error
> {
	return {
		name: "blog-list-loader",

		/**
		 * Load a collection of blog posts with optional filtering
		 */
		loadCollection: async ({ filter }) => {
			try {
				const typedFilter = filter as BlogCollectionFilter | undefined;

				const input = {
					limit: typedFilter?.limit ?? 100,
					page: typedFilter?.page ?? 1,
					status: typedFilter?.status ?? "published",
					search: typedFilter?.search,
					sortBy: typedFilter?.sortBy ?? "publishedAt",
					sortOrder: typedFilter?.sortOrder ?? "desc",
					featuredOnly: typedFilter?.featuredOnly ?? false,
				};

				const result = await fetchFromCMS<ListPostsOutput>(
					"blog.listFiltered",
					input,
				);
				const posts = result.blogPosts ?? [];
				const now = new Date();

				// Only include posts with publishedAt today or in the past
				const filteredPosts = posts.filter((post: Post) => {
					if (!post.publishedAt) return true;
					const publishedDate = new Date(post.publishedAt);
					return publishedDate <= now;
				});

				return {
					entries: filteredPosts.map((post: Post) => ({
						id: post.slug,
						data: normalizePost(post),
					})),
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error loading blog posts from CMS:", error);
				return {
					error: new Error(`Failed to load blog posts: ${message}`),
				};
			}
		},

		/**
		 * Not used for list loader
		 */
		loadEntry: async () => {
			throw new Error("Use blog-full collection for individual posts");
		},
	};
}

/**
 * Live loader for full blog post data from get procedure
 * Returns complete post data including content
 */
function blogPostLoader(): LiveLoader<
	BlogData,
	BlogEntryFilter,
	BlogCollectionFilter,
	Error
> {
	return {
		name: "blog-post-loader",

		/**
		 * Not used for full loader - use loadEntry instead
		 */
		loadCollection: async () => {
			throw new Error("Use blog collection for listings");
		},

		/**
		 * Load a single blog post by ID or slug with full data
		 */
		loadEntry: async ({ filter }) => {
			try {
				const typedFilter = filter as BlogEntryFilter;

				const post = await fetchFromCMS<Post>("blog.get", {
					id: typedFilter.id,
					slug: typedFilter.slug,
				});

				if (!post) {
					return undefined;
				}

				return {
					id: post.slug,
					data: normalizePost(post),
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error loading blog post from CMS:", error);
				return {
					error: new Error(`Failed to load blog post: ${message}`),
				};
			}
		},
	};
}

/** Type for page data returned by the loader */
type PageData = Record<string, unknown>;

/**
 * Normalize a Page to ensure dates are ISO strings for schema validation
 */
function normalizePage(page: Page): Record<string, unknown> {
	return {
		...page,
		createdAt: page.createdAt
			? typeof page.createdAt === "string"
				? page.createdAt
				: new Date(page.createdAt).toISOString()
			: undefined,
		updatedAt: page.updatedAt
			? typeof page.updatedAt === "string"
				? page.updatedAt
				: new Date(page.updatedAt).toISOString()
			: undefined,
		publishedAt: page.publishedAt
			? typeof page.publishedAt === "string"
				? page.publishedAt
				: new Date(page.publishedAt).toISOString()
			: null,
	};
}

// ============================================================================
// Page Loaders
// ============================================================================

/**
 * Live loader for page listings from listPublished procedure
 * Returns minimal data for list views
 */
function pageListLoader(): LiveLoader<
	PageData,
	PageEntryFilter,
	PageCollectionFilter,
	Error
> {
	return {
		name: "page-list-loader",

		/**
		 * Load a collection of pages with optional filtering
		 */
		loadCollection: async ({ filter }) => {
			try {
				const typedFilter = filter as PageCollectionFilter | undefined;

				const input = {
					limit: typedFilter?.limit ?? 100,
					page: typedFilter?.page ?? 1,
					status: typedFilter?.status ?? "published",
					search: typedFilter?.search,
					sortBy: typedFilter?.sortBy ?? "publishedAt",
					sortOrder: typedFilter?.sortOrder ?? "desc",
				};

				const result = await fetchFromCMS<ListPagesOutput>(
					"pages.listPublished",
					input,
				);
				const pages = result.pages ?? [];
				const now = new Date();

				// Only include pages with publishedAt today or in the past
				const filteredPages = pages.filter((page: Page) => {
					if (!page.publishedAt) return true;
					const publishedDate = new Date(page.publishedAt);
					return publishedDate <= now;
				});

				return {
					entries: filteredPages.map((page: Page) => ({
						id: page.slug,
						data: normalizePage(page),
					})),
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error loading pages from CMS:", error);
				return {
					error: new Error(`Failed to load pages: ${message}`),
				};
			}
		},

		/**
		 * Not used for list loader
		 */
		loadEntry: async () => {
			throw new Error("Use pageFull collection for individual pages");
		},
	};
}

/**
 * Live loader for full page data from get procedure
 * Returns complete page data including content
 */
function pageLoader(): LiveLoader<
	PageData,
	PageEntryFilter,
	PageCollectionFilter,
	Error
> {
	return {
		name: "page-loader",

		/**
		 * Not used for full loader - use loadEntry instead
		 */
		loadCollection: async () => {
			throw new Error("Use pageList collection for listings");
		},

		/**
		 * Load a single page by ID or slug with full data
		 */
		loadEntry: async ({ filter }) => {
			try {
				const typedFilter = filter as PageEntryFilter;

				const page = await fetchFromCMS<Page>("pages.get", {
					id: typedFilter.id,
					slug: typedFilter.slug,
				});

				if (!page) {
					return undefined;
				}

				return {
					id: page.slug,
					data: normalizePage(page),
				};
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Error loading page from CMS:", error);
				return {
					error: new Error(`Failed to load page: ${message}`),
				};
			}
		},
	};
}

// ============================================================================
// Blog Collections
// ============================================================================

export const collections = {
	blogList: defineLiveCollection({
		loader: blogListLoader(),
		schema: blogListSchema,
	}),
	blogPost: defineLiveCollection({
		loader: blogPostLoader(),
		schema: blogPostSchema,
	}),
	pageList: defineLiveCollection({
		loader: pageListLoader(),
		schema: pageListSchema,
	}),
	page: defineLiveCollection({
		loader: pageLoader(),
		schema: pageSchema,
	}),
};
