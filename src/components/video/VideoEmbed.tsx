/**
 * Video Embed Component
 *
 * A lightweight Mux video player component for embedding videos throughout
 * the Astro app. Handles both public and signed playback policies.
 */

import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { VideoOff } from "lucide-react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignedTokens } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";

interface VideoEmbedProps {
	videoId: string;
	libraryId: string;
	thumbnailTime?: number;
	className?: string;
}

type VideoData = {
	id: string;
	playbackId: string;
	title: string;
	policy: "public" | "signed";
};

type TypedTrpcClient = {
	mux: {
		getVideoById: {
			query: (input: {
				videoId: string;
				libraryId: string;
			}) => Promise<VideoData>;
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

function VideoEmbedContent({
	videoId,
	libraryId,
	thumbnailTime = 5,
	className,
}: VideoEmbedProps) {
	const client = trpcClient as unknown as TypedTrpcClient;
	const playerThumbnailTime =
		typeof thumbnailTime === "number" ? thumbnailTime : 5;

	// Fetch video data
	const {
		data: video,
		isLoading: videoLoading,
		error: videoError,
	} = useQuery({
		queryKey: ["mux", "getVideoById", videoId, libraryId],
		queryFn: () => client.mux.getVideoById.query({ videoId, libraryId }),
		enabled: Boolean(videoId),
	});

	// Conditionally fetch signed tokens for signed playback policies
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
				expiresIn: 3600, // Tokens valid for 1 hour
				thumbnailParams: {
					time: playerThumbnailTime,
				},
			}),
		enabled: video?.policy === "signed" && Boolean(video?.playbackId),
	});

	// Loading state
	if (videoLoading) {
		return (
			<div className={className}>
				<Skeleton className="size-full aspect-video rounded-lg overflow-hidden" />
			</div>
		);
	}

	// Error state
	if (videoError || !video?.playbackId) {
		return (
			<div
				className={`h-full flex flex-col items-center justify-center gap-2 p-8 bg-destructive/10 rounded-lg ${className}`}
			>
				<VideoOff className="size-8 text-destructive" />
				<p className="text-sm text-destructive">Failed to load video</p>
			</div>
		);
	}

	// Loading tokens for signed videos
	if (video.policy === "signed" && tokensLoading) {
		return (
			<div className={className}>
				<Skeleton className="size-full aspect-video rounded-lg overflow-hidden" />
			</div>
		);
	}

	return (
		<MuxPlayer
			playbackId={video.playbackId}
			title={video.title}
			accentColor="#ea580c"
			className={`w-full aspect-video rounded-lg overflow-hidden ${className ?? ""}`}
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
	);
}

/**
 * VideoEmbed with QueryProvider wrapper
 *
 * A simple embeddable video player for use throughout the Astro app.
 *
 * @example
 * ```astro
 * <VideoEmbed
 *   client:load
 *   videoId="abc123"
 *   libraryId="lib_xyz"
 *   thumbnailTime={10}
 * />
 * ```
 */
export function VideoEmbed(props: VideoEmbedProps) {
	return (
		<QueryProvider>
			<VideoEmbedContent {...props} />
		</QueryProvider>
	);
}

export default VideoEmbed;
