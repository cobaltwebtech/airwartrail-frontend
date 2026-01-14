/**
 * Single Video Player Component
 *
 * A test component for rendering a single Mux video with signed playback tokens.
 * Uses TanStack Query to fetch video asset and conditionally generate signed tokens.
 */

import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { SignedTokens } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";

interface SingleVideoPlayerProps {
	/** The Mux Asset ID for fetching video details */
	muxAssetId: string;
	/** The library ID for the video */
	libraryId: string;
	/** Video title fallback (optional, will use fetched title if available) */
	title?: string;
}

// Type definitions for tRPC calls (since AppRouter is AnyRouter across repos)
type MuxAsset = {
	playbackId: string;
	title: string;
	policy: "public" | "signed";
	aspectRatio?: string;
};

type TypedTrpcClient = {
	mux: {
		getAsset: {
			query: (input: {
				assetId: string;
				libraryId?: string;
			}) => Promise<MuxAsset>;
		};
		generateSignedTokens: {
			query: (input: {
				playbackId: string;
				libraryId?: string;
				expiresIn?: number;
			}) => Promise<SignedTokens>;
		};
	};
};

function VideoPlayerContent({
	muxAssetId,
	libraryId,
	title: fallbackTitle,
}: SingleVideoPlayerProps) {
	const client = trpcClient as unknown as TypedTrpcClient;

	// Step 1: Fetch video asset to get playbackId and policy
	const {
		data: video,
		isLoading: videoLoading,
		error: videoError,
	} = useQuery({
		queryKey: ["mux", "getAsset", muxAssetId, libraryId],
		queryFn: () =>
			client.mux.getAsset.query({ assetId: muxAssetId, libraryId }),
	});

	// Step 2: Conditionally fetch tokens ONLY for signed videos
	const { data: tokens, isLoading: tokensLoading } = useQuery({
		queryKey: ["mux", "generateSignedTokens", video?.playbackId, libraryId],
		queryFn: () =>
			client.mux.generateSignedTokens.query({
				playbackId: video?.playbackId || "",
				libraryId,
				expiresIn: 3600,
			}),
		// Only fetch tokens if video is signed and has a playbackId
		enabled: video?.policy === "signed" && Boolean(video?.playbackId),
	});

	// Loading state for video fetch
	if (videoLoading) {
		return (
			<div className="flex items-center justify-center bg-muted rounded-lg aspect-video">
				<div className="animate-pulse text-muted-foreground">
					Loading video...
				</div>
			</div>
		);
	}

	// Error state
	if (videoError || !video?.playbackId) {
		return (
			<div className="flex items-center justify-center bg-destructive/10 rounded-lg p-4 aspect-video">
				<div className="text-destructive text-center">
					<p className="font-semibold">Failed to load video</p>
					<p className="text-sm mt-1">
						{videoError instanceof Error
							? videoError.message
							: "Unable to load video"}
					</p>
				</div>
			</div>
		);
	}

	// For signed videos, wait for tokens
	if (video.policy === "signed" && tokensLoading) {
		return (
			<div className="flex items-center justify-center bg-muted rounded-lg aspect-video">
				<div className="animate-pulse text-muted-foreground">
					Generating secure playback tokens...
				</div>
			</div>
		);
	}

	return (
		<MuxPlayer
			playbackId={video.playbackId}
			title={video.title || fallbackTitle}
			streamType="on-demand"
			tokens={
				video.policy === "signed" && tokens
					? {
							playback: tokens.playback,
							thumbnail: tokens.thumbnail,
							storyboard: tokens.storyboard,
						}
					: undefined
			}
			accentColor="#ea580c"
			className="w-full aspect-video rounded-lg overflow-hidden"
		/>
	);
}

/**
 * SingleVideoPlayer with QueryProvider wrapper
 *
 * Use this component directly in Astro pages.
 *
 * @example
 * ```astro
 * <SingleVideoPlayer
 *   client:load
 *   muxAssetId="wu02lOVyy019aSdxiF9m7DN1sZUqkvnVYFu9xFY6y7EJI"
 *   libraryId="NsJZrLfu"
 *   title="My Video"
 * />
 * ```
 */
export function SingleVideoPlayer(props: SingleVideoPlayerProps) {
	return (
		<QueryProvider>
			<VideoPlayerContent {...props} />
		</QueryProvider>
	);
}

export default SingleVideoPlayer;
