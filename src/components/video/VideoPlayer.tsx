/**
 * Video Player Detail Component
 *
 * Fetches a video by internal ID (combines DB + Mux data) and renders it with
 * Mux Player. Includes signed token handling and skeleton states for loading
 * and error scenarios.
 *
 * Can optionally require a subscription to view the video.
 */

import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { Hourglass, Loader2, VideoOff } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	Chapter,
	GetVideoTagsInput,
	SignedTokens,
	VideoTagDetail,
} from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";
import {
	formatDescription,
	formatDuration,
	formatTimeAgo,
} from "@/lib/video-helpers";

interface VideoPlayerDetailProps {
	videoId: string;
	libraryId: string;
	thumbnailTime?: number;
	/** Whether this video requires a subscription to view */
	requiresSub: boolean;
}

type FullVideo = {
	id: string;
	playbackId: string;
	title: string;
	duration: number;
	description?: string;
	createdAt: string;
	views?: number;
	policy: "public" | "signed";
	aspectRatio?: string;
	tags?: string[];
	isPublished: boolean;
};

type TypedTrpcClient = {
	mux: {
		getVideoById: {
			query: (input: {
				videoId: string;
				libraryId: string;
			}) => Promise<FullVideo>;
		};
		getChapters: {
			query: (input: {
				videoId: string;
				libraryId: string;
			}) => Promise<Chapter[]>;
		};
		getVideoTags: {
			query: (input: GetVideoTagsInput) => Promise<VideoTagDetail[]>;
		};
		getThumbnail: {
			query: (input: { videoId: string; libraryId: string }) => Promise<{
				customThumbnailUrl: string | null;
				customThumbnailTime: number | null;
			}>;
		};
		generateSignedTokens: {
			query: (input: {
				playbackId: string;
				libraryId?: string;
				expiresIn?: number;
				thumbnailParams?: {
					time: number;
				};
			}) => Promise<SignedTokens>;
		};
	};
};

function VideoPlayerDetailContent({
	videoId,
	libraryId,
	thumbnailTime = 5,
	requiresSub,
}: VideoPlayerDetailProps) {
	// Check session and subscription status only if required
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const checkAuth = requiresSub;

	// Set token expiration time based on subscription requirement
	const tokenExpiresIn = requiresSub ? 10800 : 3600; // 3 hours vs 1 hour

	const client = trpcClient as unknown as TypedTrpcClient;
	const playerRef = useRef<MuxPlayerRefAttributes | null>(null);
	const setPlayerRef = (node: unknown) => {
		playerRef.current = node as MuxPlayerRefAttributes | null;
	};
	// Fetch video by internal ID (preferred API)
	const {
		data: video,
		isLoading: videoLoading,
		error: videoError,
	} = useQuery({
		queryKey: ["mux", "getVideoById", videoId, libraryId],
		queryFn: () => client.mux.getVideoById.query({ videoId, libraryId }),
		enabled: Boolean(videoId),
	});

	// Fetch custom thumbnail data from database (custom URL and time)
	const { data: thumbnailData } = useQuery({
		queryKey: ["mux", "getThumbnail", videoId, libraryId],
		queryFn: () => client.mux.getThumbnail.query({ videoId, libraryId }),
		enabled: Boolean(videoId) && Boolean(libraryId),
	});

	// Determine thumbnail configuration based on priority:
	// 1. customThumbnailUrl from database
	// 2. customThumbnailTime from database
	// 3. thumbnailTime prop
	// 4. Default to 5 seconds
	const customThumbnailUrl = thumbnailData?.customThumbnailUrl;
	const customThumbnailTime = thumbnailData?.customThumbnailTime;
	const effectiveThumbnailTime =
		customThumbnailTime !== null && customThumbnailTime !== undefined
			? customThumbnailTime
			: (thumbnailTime ?? 5);

	// Fetch tokens for signed videos
	// Include thumbnail time in the token if set (for signed videos)
	const { data: tokens, isLoading: tokensLoading } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokens",
			video?.playbackId,
			libraryId,
			effectiveThumbnailTime,
			tokenExpiresIn,
		],
		queryFn: () =>
			client.mux.generateSignedTokens.query({
				playbackId: video?.playbackId || "",
				libraryId,
				expiresIn: tokenExpiresIn,
				// For signed videos, embed the thumbnail time in the JWT
				thumbnailParams:
					effectiveThumbnailTime !== undefined
						? { time: effectiveThumbnailTime }
						: undefined,
			}),
		enabled: video?.policy === "signed" && Boolean(video?.playbackId),
	});

	const {
		data: chapters,
		isLoading: chaptersLoading,
		error: chaptersError,
	} = useQuery({
		queryKey: ["mux", "getChapters", videoId, libraryId],
		queryFn: () => client.mux.getChapters.query({ videoId, libraryId }),
		enabled: Boolean(videoId),
	});

	const {
		data: videoTags,
		isLoading: tagsLoading,
		error: tagsError,
	} = useQuery({
		queryKey: ["mux", "getVideoTags", videoId, libraryId],
		queryFn: () => client.mux.getVideoTags.query({ videoId, libraryId }),
		enabled: Boolean(videoId),
	});

	const seekToChapter = (startTime: number) => {
		const node = playerRef.current;
		if (!node) return;
		node.currentTime = startTime;
		node.play().catch(() => undefined);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const hasChapters = (chapters?.length ?? 0) > 0;
	const showChaptersSection = chaptersLoading || hasChapters;
	const showChapterError = hasChapters && Boolean(chaptersError);

	const addChaptersToPlayer = useEffectEvent(() => {
		const player = playerRef.current;
		if (!player || !hasChapters || chaptersLoading || !chapters) return;

		player.addChapters(
			chapters.map((chapter) => ({
				startTime: chapter.startTime,
				endTime: chapter.endTime ?? undefined,
				value: chapter.title,
			})),
		);
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: relying on useEffectEvent for latest chapters while re-running per playbackId change
	useEffect(() => {
		const player = playerRef.current;
		if (!player) return;

		const handleMetadata = () => addChaptersToPlayer();
		player.addEventListener("loadedmetadata", handleMetadata);

		if (player.readyState >= 1) {
			addChaptersToPlayer();
		}

		return () => {
			player.removeEventListener("loadedmetadata", handleMetadata);
		};
	}, [video?.playbackId, addChaptersToPlayer]);

	// Show loading state during hydration or auth check (only if auth is required)
	if (checkAuth && (!mounted || authLoading)) {
		return (
			<section className="w-full grid md:grid-cols-[3fr_1fr] gap-4">
				<Card className="pt-0">
					<div className="relative">
						<Skeleton className="w-full aspect-video" />
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
							<Loader2 className="size-8 animate-spin" />
							<span>Loading Video...</span>
						</div>
					</div>
					<CardContent className="h-17.5 w-full" />
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full" />
				</aside>
			</section>
		);
	}

	// Gate content for users without active subscription (only if auth is required)
	if (checkAuth && (!session?.user || !isPremium)) {
		return <Pricing />;
	}

	if (videoLoading) {
		return (
			<section className="w-full grid md:grid-cols-[3fr_1fr] gap-4">
				<Card className="pt-0">
					<div className="relative">
						<Skeleton className="w-full aspect-video" />
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
							<Loader2 className="size-8 animate-spin" />
							<span>Loading Video...</span>
						</div>
					</div>
					<CardContent className="h-17.5 w-full" />
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full" />
				</aside>
			</section>
		);
	}

	if (videoError || !video?.playbackId) {
		return (
			<div className="mx-auto my-8 w-fit">
				<Card className="bg-destructive">
					<CardHeader className="flex flex-col items-center gap-2">
						<VideoOff className="size-8" />
						<CardTitle className="text-lg font-bold">Video Not Found</CardTitle>
					</CardHeader>
					<CardContent>
						<a href="/streaming">
							<Button size="lg">&larr; Go Back to All Videos</Button>
						</a>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!video?.isPublished) {
		return (
			<section className="w-full grid md:grid-cols-[3fr_1fr] gap-4">
				<Card className="pt-0">
					<div className="relative">
						<Skeleton className="w-full aspect-video" />
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
							<VideoOff className="size-8 text-destructive" />
							<p className="text-lg font-bold">Video Not Available</p>
							<Button size="lg" asChild>
								<a href="/">Go Back Home</a>
							</Button>
						</div>
					</div>
					<CardContent className="h-17.5 w-full" />
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full" />
				</aside>
			</section>
		);
	}

	if (video?.policy === "signed" && tokensLoading) {
		return (
			<section className="w-full grid md:grid-cols-[3fr_1fr] gap-4">
				<Card className="pt-0">
					<div className="relative">
						<Skeleton className="w-full aspect-video" />
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
							<Loader2 className="size-8 animate-spin" />
							<span>Loading Video...</span>
						</div>
					</div>
					<CardContent className="h-17.5 w-full" />
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full" />
				</aside>
			</section>
		);
	}

	const descriptionParagraphs = formatDescription(video.description);

	function ChaptersNav() {
		if (!showChaptersSection) return null;

		return (
			<Card>
				<CardHeader>
					<CardTitle>
						<h3 className="text-lg font-semibold">Chapters</h3>
					</CardTitle>
					<CardDescription className="text-xs">
						Click on chapter to go directly to that point in time.
					</CardDescription>
					{chaptersLoading ? <Skeleton className="h-4 w-16" /> : null}
					{showChapterError ? (
						<p className="mt-2 text-sm text-destructive">
							Failed to load chapters.
						</p>
					) : null}
				</CardHeader>

				{hasChapters ? (
					<CardContent>
						<nav aria-label="Chapter markers">
							<ul className="mt-3 space-y-2">
								{chapters?.map((chapter) => (
									<li key={chapter.id} className="list-none">
										<Button
											variant="outline"
											className="w-full justify-between"
											onClick={() => seekToChapter(chapter.startTime)}
										>
											<span>{chapter.title} </span>
											<span>{formatTime(chapter.startTime)}</span>
										</Button>
									</li>
								))}
							</ul>
						</nav>
					</CardContent>
				) : null}
			</Card>
		);
	}

	function VideoTags() {
		if (tagsLoading) {
			return (
				<Card>
					<CardHeader>
						<CardTitle>
							<h3 className="text-lg font-semibold">Tags</h3>
						</CardTitle>
						<CardDescription className="text-xs">
							Categories or genre of the video. Click on a tag to see other
							films with the same tag.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-full" />
					</CardContent>
				</Card>
			);
		}

		if (tagsError) {
			return (
				<Card>
					<CardHeader>
						<CardTitle>
							<h3 className="text-lg font-semibold">Tags</h3>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-destructive">Failed to load tags</p>
					</CardContent>
				</Card>
			);
		}

		const tags = videoTags ?? [];
		if (tags.length === 0) return null;

		return (
			<Card>
				<CardHeader>
					<CardTitle>
						<h3 className="text-lg font-semibold">Tags</h3>
					</CardTitle>
					<CardDescription className="text-xs">
						Categories or genre of the video. Click on a tag to see other films
						with the same tag.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					{tags.map((tag) => (
						<a key={tag.id} href={`/streaming?tags=${tag.slug}`}>
							<Badge className="cursor-pointer hover:opacity-80 transition-opacity">
								{tag.name}
							</Badge>
						</a>
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<section className="w-full mb-8 grid md:grid-cols-[3fr_1fr] gap-4">
			<Card className="pt-0">
				<MuxPlayer
					ref={setPlayerRef}
					playbackId={video.playbackId}
					title={video.title}
					accentColor="#ea580c"
					className="w-full aspect-video rounded-lg overflow-hidden"
					streamType="on-demand"
					// Custom thumbnail takes priority over thumbnailTime
					poster={customThumbnailUrl ?? undefined}
					// Only use thumbnailTime if no custom thumbnail, not signed, and time is defined
					thumbnailTime={
						!customThumbnailUrl &&
						video.policy !== "signed" &&
						effectiveThumbnailTime !== undefined
							? effectiveThumbnailTime
							: undefined
					}
					tokens={
						video.policy === "signed" && tokens
							? {
									playback: tokens.playback,
									thumbnail: tokens.thumbnail,
									storyboard: tokens.storyboard,
								}
							: undefined
					}
				/>
				<CardHeader>
					<CardTitle>
						<h1 className="text-3xl font-bold">{video.title}</h1>
					</CardTitle>
					<CardDescription className="flex items-center gap-4 text-sm text-primary-foreground">
						<div className="flex items-center gap-1 bg-primary px-2 py-1 rounded-md w-fit">
							<Hourglass className="size-4" />
							{formatDuration(video.duration)}
						</div>
						<p>Uploaded {formatTimeAgo(video.createdAt)}</p>
					</CardDescription>
					<CardAction>
						<Badge>{video.views} views</Badge>
					</CardAction>
				</CardHeader>
				<CardContent className="space-y-2 font-light text-sm text-pretty">
					{descriptionParagraphs.map((paragraph, idx) => (
						<p key={`${video.id}-paragraph-${idx}`}>{paragraph}</p>
					))}
				</CardContent>
			</Card>

			{(showChaptersSection ||
				tagsLoading ||
				tagsError ||
				(videoTags?.length ?? 0) > 0) && (
				<aside className="space-y-4">
					<ChaptersNav />
					<VideoTags />
				</aside>
			)}
		</section>
	);
}

/**
 * VideoPlayer with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <VideoPlayer client:load videoId={videoId} libraryId={libraryId} requiresSub={true} />
 * <VideoPlayer client:load videoId={videoId} libraryId={libraryId} requiresSub={false} />
 * ```
 */
export function VideoPlayer(props: VideoPlayerDetailProps) {
	return (
		<QueryProvider>
			<VideoPlayerDetailContent {...props} />
		</QueryProvider>
	);
}

export default VideoPlayer;
