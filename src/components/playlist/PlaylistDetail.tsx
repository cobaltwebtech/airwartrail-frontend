/**
 * Playlist Detail Component
 *
 * Displays a single playlist with all its videos in grid or table view.
 * Supports sorting, searching, and view mode preferences.
 * Works for both free and premium content with optional subscription gating.
 */

import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import {
	CircleArrowLeft,
	CircleArrowRight,
	Film,
	Loader2,
	OctagonX,
	Play,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import type { Playlist, PlaylistVideo } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";
import { formatDuration, formatTimeAgo } from "@/lib/video-helpers";

interface PlaylistDetailProps {
	/** The playlist slug to fetch */
	slug: string;
	/** The library ID */
	libraryId: string;
	/** Whether this playlist requires a subscription to view */
	requiresSub: boolean;
	/** If true, hide completely when user doesn't have access (instead of showing Pricing) */
	hidePlaylist?: boolean;
}

type GetPlaylistClient = {
	mux: {
		getPlaylist: {
			query: (input: {
				libraryId: string;
				playlistId?: string;
				slug?: string;
				includeVideos?: boolean;
			}) => Promise<
				Playlist & {
					videos: PlaylistVideo[];
					thumbnailPlaybackId: string | null;
				}
			>;
		};
	};
};

function PlaylistDetailContent({
	slug,
	libraryId,
	requiresSub,
	hidePlaylist = false,
}: PlaylistDetailProps) {
	// Check session and subscription status only if this is premium content
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const [emblaRef, emblaApi] = useEmblaCarousel({
		// Embla options see https://www.embla-carousel.com/api/options/
		align: "start",
		skipSnaps: false,
	});

	// Fetch playlist with videos
	const {
		data: playlist,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["mux", "getPlaylist", libraryId, slug],
		queryFn: async () => {
			const client = trpcClient as unknown as GetPlaylistClient;
			return client.mux.getPlaylist.query({
				libraryId,
				slug,
				includeVideos: true,
			});
		},
		// Only fetch premium content after auth check completes
		enabled: requiresSub ? !authLoading : true,
	});

	const goToPrev = () => {
		emblaApi?.goToPrev();
	};
	const goToNext = () => {
		emblaApi?.goToNext();
	};

	// Filter and sort videos
	const filteredVideos = useMemo(() => {
		// clone array so sort is pure
		const videos = Array.from(playlist?.videos ?? []);
		return videos
			.filter((video) => video.isPublished === true)
			.filter((video) => video.status === "ready")
			.sort((a, b) => {
				const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
				const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;
				return aOrder - bOrder;
			});
	}, [playlist?.videos]);

	const buildVideoUrl = useCallback(
		(videoId: string) => {
			const prefix = requiresSub ? "premium" : "basic";
			// Find the index of this video in the filtered list
			const videoIndex = filteredVideos.findIndex((v) => v.id === videoId);
			// If found in playlist, link to playlist player with video index
			if (videoIndex >= 0 && slug) {
				return `/watch/playlist/${prefix}/${slug}?sort_order=${videoIndex}`;
			}
			// Fallback to individual video player
			return `/watch/${prefix}/${libraryId}/video/${videoId}`;
		},
		[libraryId, slug, filteredVideos, requiresSub],
	);

	// Show loading state during hydration or auth check (only for premium content)
	if (requiresSub && (!mounted || authLoading)) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Gate content for users without active subscription (only for premium content)
	if (requiresSub && (!session?.user || !isPremium)) {
		// If hidePlaylist is true, render nothing (component was conditionally shown)
		if (hidePlaylist) {
			return null;
		}
		// Otherwise show pricing
		return <Pricing />;
	}

	if (error) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-4 text-center text-destructive">
				<OctagonX className="size-12" />
				<p>Error Loading Playlist</p>
				<p>Try refreshing the page.</p>
			</div>
		);
	}

	if (isLoading) {
		return <PlaylistDetailSkeleton />;
	}

	if (!playlist || !playlist.isPublished) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-16">
				<Film className="size-16 text-muted-foreground" />
				<p className="text-lg text-muted-foreground">Playlist not found.</p>
			</div>
		);
	}

	return (
		<section className="w-full space-y-6">
			{/* Playlist header */}
			<div className="space-y-2">
				<div className="flex justify-between items-center">
					<h1 className="text-3xl font-bold">{playlist.name}</h1>
					<Badge variant="secondary">
						{playlist.videoCount} {playlist.videoCount === 1 ? "film" : "films"}
					</Badge>
				</div>
				{playlist.description && (
					<p className="text-muted-foreground">{playlist.description}</p>
				)}
			</div>
			{/* Playlist videos wrapped in Embla carousel */}
			{filteredVideos.length > 0 && (
				<div className="relative mx-6 my-8 embla-carousel">
					{/* Left Control - Absolutely Positioned */}
					<div className="absolute left-0 top-1/2 z-20 -translate-y-1/2 -translate-x-12">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="reversed"
									size="icon"
									onClick={goToPrev}
									aria-label="Previous Film"
								>
									<CircleArrowLeft />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Previous Film</TooltipContent>
						</Tooltip>
					</div>

					<div className="embla-viewport" ref={emblaRef}>
						<div className="embla-container gap-4">
							{filteredVideos.map((video) => (
								<Card
									key={video.id}
									className="w-full max-w-90 min-w-90 gap-1 overflow-hidden p-0 transition-colors hover:bg-background"
								>
									<a href={buildVideoUrl(video.id)}>
										<div className="relative">
											<VideoThumbnail
												playbackId={video.muxPlaybackId}
												alt={video.title}
												className="aspect-video w-full object-cover"
												aspectVideo
												policy={video.playbackPolicy ?? undefined}
												libraryId={libraryId}
												videoId={video.id}
											/>
											<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
												<div className="inline-flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
													<Play className="size-6" />
												</div>
											</div>
											<div className="absolute right-2 bottom-2 rounded bg-black/70 p-1 text-xs text-white">
												{formatDuration(video.duration ?? 0)}
											</div>
										</div>
									</a>
									<CardHeader className="flex items-center justify-between p-4">
										<a
											href={buildVideoUrl(video.id)}
											className="text-left hover:text-accent-foreground"
										>
											<h3 className="line-clamp-2 font-semibold">
												{video.customTitle || video.title}
											</h3>
										</a>
										{video.customDescription && (
											<CardDescription className="mt-2 line-clamp-2">
												{video.customDescription}
											</CardDescription>
										)}
									</CardHeader>
									<CardFooter className="flex justify-between p-4 pt-0 text-xs text-muted-foreground">
										<span>Uploaded {formatTimeAgo(video.createdAt)}</span>
									</CardFooter>
								</Card>
							))}
						</div>
					</div>

					{/* Right Control - Absolutely Positioned */}
					<div className="absolute right-0 top-1/2 z-20 -translate-y-1/2 translate-x-12">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="reversed"
									size="icon"
									onClick={goToNext}
									aria-label="Next Film"
								>
									<CircleArrowRight />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Next Film</TooltipContent>
						</Tooltip>
					</div>
				</div>
			)}

			{filteredVideos.length === 0 && (
				<div className="flex flex-col items-center justify-center gap-4 py-16">
					<Film className="h-16 w-16 text-muted-foreground" />
					<p className="text-lg text-muted-foreground">
						No videos found in this playlist.
					</p>
				</div>
			)}
		</section>
	);
}

function PlaylistDetailSkeleton() {
	return (
		<section className="w-full space-y-6">
			{/* Header skeleton */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-24" />
				</div>
				<Skeleton className="h-10 w-2/3" />
				<Skeleton className="h-6 w-full" />
			</div>

			{/* Controls skeleton */}
			<div className="flex justify-between gap-2">
				<Skeleton className="h-10 w-64" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-20" />
				</div>
			</div>

			{/* Grid skeleton */}
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items are static
					<Card key={`skeleton-${i}`} className="overflow-hidden p-0">
						<Skeleton className="aspect-video w-full" />
						<CardHeader className="p-4">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="mt-2 h-4 w-full" />
						</CardHeader>
						<CardFooter className="p-4 pt-0">
							<Skeleton className="h-4 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		</section>
	);
}

/**
 * PlaylistDetail with QueryProvider wrapper
 *
 * @example
 * ```astro
 * // For basic/free content
 * <PlaylistDetail client:load slug="playlist-slug" libraryId="your-library-id" />
 *
 * // For premium content
 * <PlaylistDetail client:load slug="premium-playlist" libraryId="your-library-id" requiresSub={true} />
 * ```
 */
export function PlaylistDetail(props: PlaylistDetailProps) {
	return (
		<QueryProvider showDevtools={false}>
			<PlaylistDetailContent {...props} />
		</QueryProvider>
	);
}

export default PlaylistDetail;
