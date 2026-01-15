/**
 * Video Player Detail Component
 *
 * Fetches a video by internal ID (combines DB + Mux data) and renders it with
 * Mux Player. Includes signed token handling and skeleton states for loading
 * and error scenarios.
 */

import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, VideoOff } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
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
import { formatDescription, formatTimeAgo } from "@/lib/video-helpers";

interface VideoPlayerDetailProps {
	videoId: string;
	libraryId: string;
	thumbnailTime?: number;
}

type FullVideo = {
	id: string;
	playbackId: string;
	title: string;
	description?: string;
	createdAt: string;
	views?: number;
	policy: "public" | "signed";
	aspectRatio?: string;
	tags?: string[];
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
}: VideoPlayerDetailProps) {
	const client = trpcClient as unknown as TypedTrpcClient;
	const playerRef = useRef<MuxPlayerRefAttributes | null>(null);
	const setPlayerRef = (node: unknown) => {
		playerRef.current = node as MuxPlayerRefAttributes | null;
	};
	const playerThumbnailTime =
		typeof thumbnailTime === "number" ? thumbnailTime : 5;
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

	// Conditionally fetch signed tokens
	const { data: tokens, isLoading: tokensLoading } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokens",
			video?.playbackId,
			libraryId,
			playerThumbnailTime,
		],
		queryFn: () =>
			client.mux.generateSignedTokens.query({
				playbackId: video?.playbackId || "",
				libraryId,
				expiresIn: 3600,
				thumbnailParams: {
					time: playerThumbnailTime,
				},
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

	if (videoLoading) {
		return (
			<section className="w-full grid md:grid-cols-[2fr_1fr] gap-4">
				<Card className="pt-0">
					<Skeleton className="w-full aspect-video rounded-lg overflow-hidden" />
					<CardContent className="flex items-center justify-center gap-2">
						<Loader2 className="animate-spin" />
					</CardContent>
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full rounded-lg" />
				</aside>
			</section>
		);
	}

	if (videoError || !video?.playbackId) {
		return (
			<div className="mx-auto w-fit">
				<Card className="bg-destructive">
					<CardHeader className="flex flex-col items-center gap-2">
						<VideoOff className="size-8" />
						<CardTitle className="text-lg font-bold">
							Error Loading Video
						</CardTitle>
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

	if (video.policy === "signed" && tokensLoading) {
		return (
			<section className="w-full grid md:grid-cols-[2fr_1fr] gap-4">
				<Card className="pt-0">
					<Skeleton className="w-full aspect-video rounded-lg overflow-hidden" />
					<CardContent className="flex items-center justify-center gap-2">
						<Loader2 className="animate-spin" />
					</CardContent>
				</Card>
				<aside className="space-y-4">
					<Skeleton className="size-full rounded-lg" />
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
						<CardDescription>Categories or genre of the video.</CardDescription>
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
						<CardDescription>Categories or genre of the video.</CardDescription>
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
					<CardDescription>Categories or genre of the video.</CardDescription>
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
		<section className="mb-8 grid md:grid-cols-[3fr_1fr] gap-4">
			<Card className="pt-0">
				<MuxPlayer
					ref={setPlayerRef}
					playbackId={video.playbackId}
					title={video.title}
					accentColor="#ea580c"
					className="w-full aspect-video rounded-lg overflow-hidden"
					streamType="on-demand"
					thumbnailTime={
						video.policy === "signed" ? undefined : playerThumbnailTime
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
					<CardDescription className="text-xs">
						<p>Uploaded</p>
						<p>{formatTimeAgo(video.createdAt)}</p>
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

			<aside className="space-y-4">
				<ChaptersNav />
				<VideoTags />
				<Card className="p-4">Add additional info here later on</Card>
			</aside>
		</section>
	);
}

/**
 * VideoPlayerDetail with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <VideoPlayerDetail
 *   client:load
 *   videoId={videoId}
 *   libraryId={libraryId}
 * />
 * ```
 */
export function VideoPlayerDetail(props: VideoPlayerDetailProps) {
	return (
		<QueryProvider>
			<VideoPlayerDetailContent {...props} />
		</QueryProvider>
	);
}

export default VideoPlayerDetail;
