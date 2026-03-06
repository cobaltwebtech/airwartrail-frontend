/**
 * Related Videos Component
 *
 * Displays up to 4 related videos based on shared tags.
 * Falls back to most recently added videos if no tags match.
 * Works for both free and premium content.
 */

import { useQuery } from "@tanstack/react-query";
import { Film, Loader2, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpcClient } from "@/lib/trpc";
import { VideoThumbnail } from "./VideoThumbnail";

interface RelatedVideosProps {
	/** Current video ID to exclude from results */
	videoId: string;
	/** Library ID to fetch videos from */
	libraryId: string;
	/** Tag IDs associated with the current video */
	tagIds?: string[];
	/** Whether these are premium videos */
	isPremium: boolean;
}

type Video = {
	id: string;
	title: string;
	playbackId: string | null;
	policy: "public" | "signed";
	duration: number | null;
	isPublished: boolean;
};

type VideoTag = {
	id: string;
	name: string;
	slug: string;
};

type SearchVideoResult = {
	id: string;
	title: string;
	muxPlaybackId: string | null;
	playbackPolicy: "public" | "signed";
	duration: number;
	isPublished: boolean;
};

type TypedTrpcClient = {
	mux: {
		searchVideosByTags: {
			query: (input: {
				libraryId: string;
				tagIds: string[];
				matchMode: "any" | "all";
				limit?: number;
				offset?: number;
			}) => Promise<SearchVideoResult[]>;
		};
		listVideosFromDatabase: {
			query: (input: {
				libraryId: string;
				limit?: number;
				offset?: number;
			}) => Promise<Video[]>;
		};
		getVideoTags: {
			query: (input: {
				videoId: string;
				libraryId: string;
			}) => Promise<VideoTag[]>;
		};
	};
};

const MAX_RELATED_VIDEOS = 4;

const formatDuration = (seconds: number | null | undefined): string => {
	if (!seconds) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

function RelatedVideosContent({
	videoId,
	libraryId,
	tagIds: externalTagIds,
	isPremium = false,
}: RelatedVideosProps) {
	const client = trpcClient as unknown as TypedTrpcClient;

	// Prevent hydration mismatch by only rendering on client
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	// Fetch current video's tags if not provided externally
	const {
		data: videoTags,
		isLoading: isLoadingTags,
		error: tagsError,
	} = useQuery({
		queryKey: ["mux", "getVideoTags", videoId, libraryId],
		queryFn: () => client.mux.getVideoTags.query({ videoId, libraryId }),
		enabled: !externalTagIds && Boolean(videoId),
	});

	const tagIds = useMemo(() => {
		if (externalTagIds && externalTagIds.length > 0) return externalTagIds;
		return videoTags?.map((tag) => tag.id) ?? [];
	}, [externalTagIds, videoTags]);

	const hasTagIds = tagIds.length > 0;

	// Fetch related videos by tags
	const {
		data: tagRelatedVideos,
		isLoading: isLoadingTagVideos,
		error: tagVideosError,
	} = useQuery({
		queryKey: ["mux", "searchVideosByTags", libraryId, tagIds, "related"],
		queryFn: async () => {
			const results = await client.mux.searchVideosByTags.query({
				libraryId,
				tagIds,
				matchMode: "any",
				limit: MAX_RELATED_VIDEOS + 1, // Fetch extra in case current video is included
			});
			// Map to unified Video type
			return results.map(
				(r): Video => ({
					id: r.id,
					title: r.title,
					playbackId: r.muxPlaybackId,
					policy: r.playbackPolicy,
					duration: r.duration,
					isPublished: r.isPublished,
				}),
			);
		},
		enabled: hasTagIds,
	});

	// Filter tag-related videos (exclude current video and unpublished)
	const filteredTagVideos = useMemo(() => {
		if (!tagRelatedVideos) return [];
		return tagRelatedVideos.filter(
			(video) => video.id !== videoId && video.isPublished,
		);
	}, [tagRelatedVideos, videoId]);

	// Determine if we need to fetch fallback videos
	// Enable fallback if: no tags OR tag query finished but has insufficient results
	const needsFallback =
		!hasTagIds ||
		(!isLoadingTagVideos && filteredTagVideos.length < MAX_RELATED_VIDEOS);

	// Fetch recent videos as fallback
	const {
		data: recentVideos,
		isLoading: isLoadingRecentVideos,
		error: recentVideosError,
	} = useQuery({
		queryKey: ["mux", "listVideosFromDatabase", libraryId, "recent-fallback"],
		queryFn: async () => {
			const results = await client.mux.listVideosFromDatabase.query({
				libraryId,
				limit: MAX_RELATED_VIDEOS + 1,
				offset: 0,
			});
			return results.map(
				(r): Video => ({
					id: r.id,
					title: r.title,
					playbackId: r.playbackId,
					policy: r.policy,
					duration: r.duration,
					isPublished: r.isPublished,
				}),
			);
		},
		enabled: needsFallback,
	});

	// Determine which videos to display
	const relatedVideos = useMemo(() => {
		// If we have enough tag-related videos, use them
		if (filteredTagVideos.length >= MAX_RELATED_VIDEOS) {
			return filteredTagVideos.slice(0, MAX_RELATED_VIDEOS);
		}

		// Otherwise, supplement with recent videos (avoiding duplicates)
		const tagVideoIds = new Set(filteredTagVideos.map((v) => v.id));
		const filteredRecentVideos = (recentVideos ?? []).filter(
			(video) =>
				video.id !== videoId && video.isPublished && !tagVideoIds.has(video.id),
		);

		// Combine tag videos with recent videos
		const combined = [...filteredTagVideos, ...filteredRecentVideos];
		return combined.slice(0, MAX_RELATED_VIDEOS);
	}, [filteredTagVideos, recentVideos, videoId]);

	// Loading state: still loading if any required query is in progress
	const isLoading =
		!mounted ||
		isLoadingTags ||
		isLoadingTagVideos ||
		(needsFallback && isLoadingRecentVideos);
	const hasError = tagsError || tagVideosError || recentVideosError;

	const buildVideoUrl = (id: string) => {
		const prefix = isPremium ? "premium" : "basic";
		return `/watch/${prefix}/${libraryId}/video/${id}`;
	};

	if (isLoading) {
		return (
			<div className="w-full">
				<h3 className="text-lg font-semibold">Related Videos</h3>
				<div className="max-w-85">
					<Card className="pt-0">
						<Skeleton className="aspect-video w-full" />
						<CardContent>
							<Loader2 className="size-8 animate-spin" />
							<p>Loading related videos...</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="space-y-4 my-8 text-center">
				<h3 className="text-lg font-semibold">Related Videos</h3>
				<p className="text-sm text-muted-foreground">
					Unable to load related videos.
				</p>
			</div>
		);
	}

	if (relatedVideos.length === 0) {
		return (
			<div className="space-y-4 my-8 text-center">
				<h3 className="text-lg font-semibold text-center">Related Videos</h3>
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<Film className="text-muted-foreground mb-2 h-8 w-8" />
					<p className="text-sm text-muted-foreground">
						No related videos found.
					</p>
				</div>
			</div>
		);
	}

	return (
		<section className="mb-8 space-y-4 w-full">
			<h3 className="text-lg font-semibold">Related Videos</h3>
			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				{relatedVideos.map((video) => (
					<Card
						key={video.id}
						className="hover:bg-background transition-colors gap-1 overflow-hidden p-0"
					>
						<a href={buildVideoUrl(video.id)}>
							<div className="relative">
								<VideoThumbnail
									playbackId={video.playbackId}
									alt={video.title}
									className="aspect-video w-full object-cover"
									aspectVideo
									policy={video.policy ?? undefined}
									libraryId={libraryId}
									videoId={video.id}
								/>
								<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
									<div className="inline-flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
										<Play className="size-6" />
									</div>
								</div>
								<div className="absolute right-2 bottom-2 rounded bg-black/70 p-1 text-xs text-white">
									{formatDuration(video.duration)}
								</div>
							</div>
						</a>
						<CardHeader className="p-4 flex items-center justify-between">
							<a
								href={buildVideoUrl(video.id)}
								className="text-left hover:text-accent-foreground"
							>
								<h4 className="font-semibold line-clamp-2 text-sm">
									{video.title}
								</h4>
							</a>
						</CardHeader>
					</Card>
				))}
			</div>
		</section>
	);
}

/**
 * RelatedVideos with QueryProvider wrapper
 *
 * @example
 * ```astro
 * // For basic/free content
 * <RelatedVideos
 *   client:load
 *   videoId={videoId}
 *   libraryId={libraryId}
 * />
 *
 * // For premium content
 * <RelatedVideos
 *   client:load
 *   videoId={videoId}
 *   libraryId={libraryId}
 *   isPremium={true}
 * />
 * ```
 */
export function RelatedVideos(props: RelatedVideosProps) {
	return (
		<QueryProvider>
			<RelatedVideosContent {...props} />
		</QueryProvider>
	);
}

export default RelatedVideos;
