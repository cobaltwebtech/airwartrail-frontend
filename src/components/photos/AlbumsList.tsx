/**
 * Photo Albums Component
 *
 * Displays published photo albums in a responsive grid with infinite scroll.
 * Fetches albums from the Cloudflare Images API via tRPC.
 * Requires an active subscription to view.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { ImageIcon, Images, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpcClient } from "@/lib/trpc";
import type {
	Album,
	Image as CfImage,
	ListAlbumsOutput,
} from "@/lib/trpc/types";
import { useSubStatus } from "@/lib/useSubStatus";

// ============================================================================
// Constants
// ============================================================================

const ALBUMS_PER_PAGE = 20;

// ============================================================================
// Types
// ============================================================================

interface AlbumsListProps {
	/** Whether this component requires a subscription to view */
	requiresSub: boolean;
}

type AlbumWithCover = Album & { coverImage: CfImage | null };

// ============================================================================
// Helpers
// ============================================================================

const formatDate = (date: Date | string | null | undefined): string => {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Renders an album cover image using the public thumbnail variant.
 * Thumbnail variant is now public and does not require signed URLs.
 */
function AlbumCoverImage({ image }: { image: CfImage }) {
	// Use public thumbnail variant directly without signed URL
	const url = `${image.deliveryUrl}/thumbnail`;

	return (
		<img
			src={url}
			alt={image.altText || "Album cover"}
			className="aspect-3/2 w-full rounded-t-lg object-cover transition-transform duration-300 group-hover:scale-105"
			loading="lazy"
			onError={(e) => {
				// Replace with fallback icon on error
				const target = e.target as HTMLImageElement;
				target.style.display = "none";
				target.parentElement?.classList.add(
					"flex",
					"items-center",
					"justify-center",
					"bg-muted",
				);
				const icon = document.createElement("div");
				icon.innerHTML =
					'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
				target.parentElement?.appendChild(icon);
			}}
		/>
	);
}

/**
 * A single album card in the grid.
 */
function AlbumCard({ album }: { album: AlbumWithCover }) {
	return (
		<a href={`/photos/${album.slug}`} className="group">
			<Card className="h-full overflow-hidden transition-shadow duration-200 group-hover:shadow-lg pt-0 bg-card-alternate">
				{/* Cover Image */}
				{album.coverImage ? (
					<AlbumCoverImage image={album.coverImage} />
				) : (
					<div className="flex aspect-3/2 w-full items-center justify-center rounded-t-lg bg-muted">
						<ImageIcon className="size-12 text-muted-foreground" />
					</div>
				)}

				{/* Album Info */}
				<CardHeader className="pb-2">
					<CardTitle className="line-clamp-1 text-lg group-hover:underline">
						{album.title}
					</CardTitle>
					{album.description && (
						<CardDescription className="line-clamp-2">
							{album.description}
						</CardDescription>
					)}
				</CardHeader>

				<CardFooter className="pt-0 text-sm text-muted-foreground">
					<div className="flex w-full items-center justify-between">
						<span className="flex items-center gap-1.5">
							<Images className="size-4" />
							{album.imageCount} {album.imageCount === 1 ? "photo" : "photos"}
						</span>
						{album.createdAt && <span>{formatDate(album.createdAt)}</span>}
					</div>
				</CardFooter>
			</Card>
		</a>
	);
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function AlbumGridSkeleton({ count = 8 }: { count?: number }) {
	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{Array.from({ length: count }).map((_, i) => {
				const key = `album-skeleton-${i}`;
				return (
					<Card key={key} className="overflow-hidden">
						<Skeleton className="aspect-3/2 w-full rounded-b-none" />
						<CardHeader className="pb-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full" />
						</CardHeader>
						<CardFooter className="pt-0">
							<div className="flex w-full items-center justify-between">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-24" />
							</div>
						</CardFooter>
					</Card>
				);
			})}
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

function AlbumsListContent({ requiresSub }: AlbumsListProps) {
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const checkAuth = requiresSub;

	// Ref for infinite scroll observer
	const loadMoreRef = useRef<HTMLDivElement>(null);

	// Infinite query for published albums (page-based pagination)
	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: [
			"cfImages",
			"albums",
			"listAlbums",
			"published",
			ALBUMS_PER_PAGE,
		],
		queryFn: async ({ pageParam = 1 }) => {
			type ListAlbumsClient = {
				cfImages: {
					albums: {
						listAlbums: {
							query: (input: {
								limit?: number;
								page?: number;
								status?: "draft" | "published" | "archived";
								sortBy?: "createdAt" | "updatedAt" | "title";
								sortOrder?: "asc" | "desc";
							}) => Promise<ListAlbumsOutput>;
						};
					};
				};
			};
			const client = trpcClient as unknown as ListAlbumsClient;
			return client.cfImages.albums.listAlbums.query({
				limit: ALBUMS_PER_PAGE,
				page: pageParam,
				status: "published",
				sortBy: "createdAt",
				sortOrder: "desc",
			});
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			const { page, totalPages } = lastPage.pagination;
			if (page < totalPages) return page + 1;
			return undefined;
		},
	});

	// Flatten all pages into a single array of albums
	const allAlbums = useMemo(() => {
		return data?.pages.flatMap((page) => page.albums) ?? [];
	}, [data]);

	// IntersectionObserver for infinite scroll
	useEffect(() => {
		if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(loadMoreRef.current);

		return () => {
			observer.disconnect();
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Show loading state during hydration or auth check
	if (checkAuth && (!mounted || authLoading)) {
		return (
			<section className="w-full space-y-6">
				<AlbumGridSkeleton count={8} />
			</section>
		);
	}

	// Gate content for users without active subscription
	if (checkAuth && (!session?.user || !isPremium)) {
		return <Pricing />;
	}

	// Error state
	if (error) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-8 text-center text-destructive">
				<ImageIcon className="mb-4 size-16" />
				<p className="text-lg font-semibold">Failed to load albums</p>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message ||
						"An unexpected error occurred. Please try again later."}
				</p>
			</div>
		);
	}

	// Initial loading state
	if (isLoading) {
		return (
			<section className="w-full space-y-6">
				<AlbumGridSkeleton count={8} />
			</section>
		);
	}

	// Empty state
	if (allAlbums.length === 0) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-12 text-center">
				<Images className="mb-4 size-16 text-muted-foreground" />
				<p className="text-lg font-semibold">No albums yet</p>
				<p className="mt-2 text-sm text-muted-foreground">
					Check back soon for new photo albums.
				</p>
			</div>
		);
	}

	return (
		<section className="w-full space-y-6">
			{/* Album Grid */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{allAlbums.map((album) => (
					<AlbumCard key={album.id} album={album} />
				))}
			</div>

			{/* Infinite scroll trigger */}
			<div ref={loadMoreRef} className="flex justify-center py-4">
				{isFetchingNextPage && (
					<div className="flex items-center text-muted-foreground">
						<Loader2 className="mr-2 size-5 animate-spin" />
						Loading more albums...
					</div>
				)}
				{!hasNextPage && allAlbums.length > 0 && (
					<p className="text-xs text-muted-foreground">
						Showing all {allAlbums.length} albums
					</p>
				)}
			</div>
		</section>
	);
}

// ============================================================================
// Exported Component with QueryProvider
// ============================================================================

/**
 * AlbumsList with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <AlbumsList client:load requiresSub={true} />
 * <AlbumsList client:load requiresSub={false} />
 * ```
 */
export function AlbumsList(props: AlbumsListProps) {
	return (
		<QueryProvider>
			<AlbumsListContent {...props} />
		</QueryProvider>
	);
}

export default AlbumsList;
