/**
 * Blog Image Signing Utility
 *
 * Signs Cloudflare Images URLs in blog post content using tRPC.
 * Since blog images use a private variant, all images require signatures.
 *
 * Flow:
 * 1. Extract cfImageId from URLs in Tiptap content
 * 2. Look up database records via cfImages.images.getImageByCfId to get internal IDs
 * 3. Sign URLs using cfImages.signedUrls.signBatch with internal IDs
 */

import type { TiptapContent, TiptapNode } from "./tiptap";
import { createServerTRPCClient } from "./trpc/server";
import type {
	GetImageByCfIdInput,
	Image,
	SignBatchInput,
	SignBatchOutput,
	SignUrlInput,
	SignUrlOutput,
	SignVariantsInput,
	SignVariantsOutput,
} from "./trpc/types";

// ============================================================================
// Constants
// ============================================================================

/** Default expiration for signed blog image URLs (1 hour) */
const BLOG_IMAGE_EXPIRATION_SECONDS = 3600;

/** The variant used for blog post images */
const BLOG_IMAGE_VARIANT = "md";

/** The small variant for responsive images */
const BLOG_IMAGE_VARIANT_SM = "sm";

// ============================================================================
// Types
// ============================================================================

interface ExtractedImage {
	/** Cloudflare Image ID (extracted from URL) */
	cfImageId: string;
	/** Original src URL */
	originalSrc: string;
	/** Variant name extracted from URL */
	variant: string;
}

interface SignedImageMap {
	/** Maps cfImageId -> variant -> signedUrl */
	[cfImageId: string]: {
		[variant: string]: string;
	};
}

// ============================================================================
// tRPC Client Types (typed wrappers for cast)
// ============================================================================

/**
 * Typed wrapper for the tRPC client to access cfImages.images procedures.
 * Required because the AppRouter type is not fully inferred.
 */
type CfImagesImagesClient = {
	cfImages: {
		images: {
			getImageByCfId: {
				query: (input: GetImageByCfIdInput) => Promise<Image>;
			};
			getImagesByCfIds: {
				query: (input: { cfImageIds: string[] }) => Promise<Image[]>;
			};
		};
	};
};

/**
 * Typed wrapper for the tRPC client to access cfImages.signedUrls procedures.
 */
type CfImagesSignedUrlsClient = {
	cfImages: {
		signedUrls: {
			signUrl: {
				query: (input: SignUrlInput) => Promise<SignUrlOutput>;
			};
			signBatch: {
				query: (input: SignBatchInput) => Promise<SignBatchOutput>;
			};
			signVariants: {
				query: (input: SignVariantsInput) => Promise<SignVariantsOutput>;
			};
		};
	};
};

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Extract Cloudflare Image ID from a delivery URL.
 * URL format: https://domain/cdn-cgi/imagedelivery/{account_hash}/{cf_image_id}/{variant}
 *
 * @param url - The Cloudflare Images delivery URL
 * @returns The cfImageId or null if not parseable
 */
export function extractCfImageIdFromUrl(url: string): string | null {
	// Match: /imagedelivery/{hash}/{cfImageId}/{variant}
	const match = url.match(/\/imagedelivery\/[^/]+\/([^/]+)\/[^/]+$/);
	return match?.[1] || null;
}

/**
 * Extract variant from Cloudflare Image Delivery URL.
 * Example: .../imageid/blog -> "blog"
 */
function extractVariantFromUrl(url: string): string {
	const match = url.match(/\/([^/]+)$/);
	return match?.[1] || BLOG_IMAGE_VARIANT;
}

// ============================================================================
// Image Extraction
// ============================================================================

/**
 * Extract Cloudflare Image IDs from Tiptap content by parsing image src URLs.
 */
function extractImagesFromTiptap(content: unknown): ExtractedImage[] {
	if (!content || typeof content !== "object") {
		return [];
	}

	const doc = content as TiptapContent;

	if (doc.type !== "doc" || !Array.isArray(doc.content)) {
		return [];
	}

	const images: ExtractedImage[] = [];
	const seenCfIds = new Set<string>();

	function traverse(nodes: TiptapNode[]): void {
		for (const node of nodes) {
			if (node.type === "image") {
				const src = node.attrs?.src as string | undefined;

				if (src) {
					const cfImageId = extractCfImageIdFromUrl(src);
					const variant = extractVariantFromUrl(src);

					if (cfImageId && !seenCfIds.has(`${cfImageId}-${variant}`)) {
						images.push({
							cfImageId,
							originalSrc: src,
							variant,
						});
						seenCfIds.add(`${cfImageId}-${variant}`);

						// Also track the small variant if blog variant is used
						if (variant === BLOG_IMAGE_VARIANT) {
							const smKey = `${cfImageId}-${BLOG_IMAGE_VARIANT_SM}`;
							if (!seenCfIds.has(smKey)) {
								images.push({
									cfImageId,
									originalSrc: src.replace(
										/\/[^/]+$/,
										`/${BLOG_IMAGE_VARIANT_SM}`,
									),
									variant: BLOG_IMAGE_VARIANT_SM,
								});
								seenCfIds.add(smKey);
							}
						}
					}
				}
			}

			if (node.content && Array.isArray(node.content)) {
				traverse(node.content);
			}
		}
	}

	traverse(doc.content);
	return images;
}

// ============================================================================
// Signing
// ============================================================================

/**
 * Look up database image records by Cloudflare Image IDs.
 * Returns a map of cfImageId -> internal database id
 */
async function lookupImageIdsByCfId(
	cfImageIds: string[],
	trpc: ReturnType<typeof createServerTRPCClient>,
): Promise<Map<string, string>> {
	const cfIdToDbId = new Map<string, string>();
	const client = trpc as unknown as CfImagesImagesClient;

	try {
		// Batch lookup all cfImageIds in a single request
		const records = await client.cfImages.images.getImagesByCfIds.query({
			cfImageIds,
		});

		for (const record of records) {
			cfIdToDbId.set(record.cfImageId, record.id);
		}

		// Log any cfImageIds that weren't found
		const foundIds = new Set(records.map((r) => r.cfImageId));
		const notFound = cfImageIds.filter((id) => !foundIds.has(id));
		if (notFound.length > 0) {
			console.warn(
				`[sign-blog-images] Images not found for cfImageIds:`,
				notFound,
			);
		}
	} catch (error) {
		console.error(
			`[sign-blog-images] Failed to lookup images by cfImageIds:`,
			error,
		);
	}

	return cfIdToDbId;
}

/**
 * Sign all images in Tiptap content.
 *
 * Flow:
 * 1. Extract cfImageIds from image URLs
 * 2. Look up internal database IDs via getImageByCfId
 * 3. Sign URLs using signBatch with internal IDs
 *
 * @param content - The Tiptap JSON content from the blog post
 * @param env - Cloudflare environment with service bindings
 * @param request - Optional request for header forwarding
 * @returns Map of cfImageId -> variant -> signedUrl
 */
export async function signTiptapImages(
	content: unknown,
	env: Env,
	request?: Request,
): Promise<SignedImageMap> {
	const images = extractImagesFromTiptap(content);

	console.log("[sign-blog-images] Extracted images:", images);

	if (images.length === 0) {
		console.log("[sign-blog-images] No images found in content");
		return {};
	}

	const trpc = createServerTRPCClient(env, request);
	const signedClient = trpc as unknown as CfImagesSignedUrlsClient;

	// Get unique cfImageIds
	const uniqueCfImageIds = [...new Set(images.map((img) => img.cfImageId))];
	console.log("[sign-blog-images] Unique cfImageIds:", uniqueCfImageIds);

	// Look up internal database IDs
	const cfIdToDbId = await lookupImageIdsByCfId(uniqueCfImageIds, trpc);
	console.log(
		"[sign-blog-images] cfIdToDbId map:",
		Object.fromEntries(cfIdToDbId),
	);

	if (cfIdToDbId.size === 0) {
		console.warn("[sign-blog-images] No images found in database");
		return {};
	}

	// Group images by variant for efficient batch signing
	const imagesByVariant = new Map<
		string,
		{ cfImageId: string; dbId: string }[]
	>();
	for (const img of images) {
		const dbId = cfIdToDbId.get(img.cfImageId);
		if (dbId) {
			const existing = imagesByVariant.get(img.variant) || [];
			existing.push({ cfImageId: img.cfImageId, dbId });
			imagesByVariant.set(img.variant, existing);
		}
	}

	// Map to return: cfImageId -> variant -> signedUrl
	const signedMap: SignedImageMap = {};

	// Sign each variant batch
	await Promise.all(
		Array.from(imagesByVariant.entries()).map(async ([variant, imageList]) => {
			try {
				const dbIds = imageList.map((img) => img.dbId);
				console.log(
					`[sign-blog-images] Signing variant "${variant}" for dbIds:`,
					dbIds,
				);

				const result = await signedClient.cfImages.signedUrls.signBatch.query({
					imageIds: dbIds,
					variant,
					expirationSeconds: BLOG_IMAGE_EXPIRATION_SECONDS,
				});

				console.log(
					`[sign-blog-images] signBatch result for "${variant}":`,
					result,
				);

				// Build a reverse map: dbId -> cfImageId for this batch
				const dbIdToCfId = new Map(
					imageList.map((img) => [img.dbId, img.cfImageId]),
				);

				for (const signed of result.images) {
					const cfImageId = dbIdToCfId.get(signed.imageId);
					if (cfImageId) {
						if (!signedMap[cfImageId]) {
							signedMap[cfImageId] = {};
						}
						signedMap[cfImageId][signed.variant] = signed.url;
					}
				}

				if (result.notFound.length > 0) {
					console.warn(
						`[sign-blog-images] Database IDs not found:`,
						result.notFound,
					);
				}
			} catch (error) {
				console.error(
					`[sign-blog-images] Failed to sign variant "${variant}":`,
					error,
				);
			}
		}),
	);

	console.log("[sign-blog-images] Final signedMap:", signedMap);
	return signedMap;
}

/**
 * Sign a single image URL by Cloudflare Image ID (used for featured images).
 *
 * @param cfImageId - The Cloudflare Image ID (from the URL)
 * @param variant - The variant to sign
 * @param env - Cloudflare environment
 * @param request - Optional request for header forwarding
 * @returns Signed URL or null if signing fails
 */
export async function signImageByCfId(
	cfImageId: string,
	variant: string,
	env: Env,
	request?: Request,
): Promise<string | null> {
	try {
		const trpc = createServerTRPCClient(env, request);
		const dbClient = trpc as unknown as CfImagesImagesClient;
		const signedClient = trpc as unknown as CfImagesSignedUrlsClient;

		// Look up internal database ID
		const record = await dbClient.cfImages.images.getImageByCfId.query({
			cfImageId,
		});

		// Sign using internal ID
		const result = await signedClient.cfImages.signedUrls.signUrl.query({
			imageId: record.id,
			variant,
			expirationSeconds: BLOG_IMAGE_EXPIRATION_SECONDS,
		});

		return result.url;
	} catch (error) {
		console.error(
			`[sign-blog-images] Failed to sign image ${cfImageId}:`,
			error,
		);
		return null;
	}
}

/**
 * Sign featured image with responsive variants by Cloudflare Image ID.
 *
 * @param cfImageId - The Cloudflare Image ID (from the URL)
 * @param env - Cloudflare environment
 * @param request - Optional request for header forwarding
 * @returns Object with signed URLs for each variant
 */
export async function signFeaturedImage(
	cfImageId: string,
	env: Env,
	request?: Request,
): Promise<{ md: string | null; sm: string | null }> {
	try {
		const trpc = createServerTRPCClient(env, request);
		const dbClient = trpc as unknown as CfImagesImagesClient;
		const signedClient = trpc as unknown as CfImagesSignedUrlsClient;

		// Look up internal database ID
		const record = await dbClient.cfImages.images.getImageByCfId.query({
			cfImageId,
		});

		const result = await signedClient.cfImages.signedUrls.signVariants.query({
			imageId: record.id,
			variants: [BLOG_IMAGE_VARIANT, BLOG_IMAGE_VARIANT_SM],
			expirationSeconds: BLOG_IMAGE_EXPIRATION_SECONDS,
		});

		const urls: { md: string | null; sm: string | null } = {
			md: null,
			sm: null,
		};

		for (const v of result.variants) {
			if (v.variant === BLOG_IMAGE_VARIANT) {
				urls.md = v.url;
			} else if (v.variant === BLOG_IMAGE_VARIANT_SM) {
				urls.sm = v.url;
			}
		}

		return urls;
	} catch (error) {
		console.error(
			`[sign-blog-images] Failed to sign featured image ${cfImageId}:`,
			error,
		);
		return { md: null, sm: null };
	}
}
