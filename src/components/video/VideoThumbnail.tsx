/**
 * Reusable video thumbnail component for Mux videos.
 * Supports public and signed playback policies with automatic token fetching.
 */
import { useQuery } from "@tanstack/react-query";
import { Film } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { type SignedTokens, trpcClient } from "@/lib/trpc";
import {
	getDefaultThumbnailDimensions,
	getMuxThumbnailUrl,
} from "@/lib/video-helpers";

export interface VideoThumbnailProps {
	/** The Mux playback ID for the video */
	playbackId: string | null | undefined;
	/** Alt text for the image */
	alt: string;
	/** Additional CSS classes for the image */
	className?: string;
	/** Whether to use 16:9 aspect ratio (640x360) instead of compact (160x90) */
	aspectVideo?: boolean;
	/** Custom width in pixels (overrides aspectVideo) */
	width?: number;
	/** Custom height in pixels (overrides aspectVideo) */
	height?: number;
	/** Playback policy - determines if signed token is required */
	policy?: "public" | "signed";
	/** Library ID - required for signed policy to fetch token and custom thumbnails */
	libraryId?: string;
	/** Internal video ID - required to fetch custom thumbnail from database */
	videoId?: string;
	/** Time in seconds to capture the thumbnail from (lowest priority, defaults to 5) */
	time?: number;
	/** Custom fallback icon component */
	fallbackIcon?: ReactNode;
}

type TypedTrpcClient = {
	mux: {
		generateSignedTokens: {
			query: (input: {
				playbackId: string;
				libraryId?: string;
				expiresIn?: number;
				thumbnailParams?: {
					time?: number;
					width?: number;
					height?: number;
					fit_mode?: "preserve" | "stretch" | "crop" | "smartcrop" | "pad";
				};
			}) => Promise<SignedTokens>;
		};
	};
};

export function VideoThumbnail({
	playbackId,
	alt,
	className = "",
	aspectVideo = false,
	width,
	height,
	policy = "public",
	libraryId,
	videoId,
	time,
	fallbackIcon,
}: VideoThumbnailProps) {
	const client = trpcClient as unknown as TypedTrpcClient;
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);

	// Calculate dimensions
	const defaultDimensions = getDefaultThumbnailDimensions(aspectVideo);
	const finalWidth = width ?? defaultDimensions.width;
	const finalHeight = height ?? defaultDimensions.height;

	// Fetch custom thumbnail data from database (if videoId and libraryId provided)
	const { data: thumbnailData, isLoading: isLoadingThumbnail } = useQuery({
		queryKey: ["mux", "getThumbnail", videoId, libraryId],
		queryFn: async () => {
			type GetThumbnailClient = {
				mux: {
					getThumbnail: {
						query: (input: { videoId: string; libraryId: string }) => Promise<{
							customThumbnailUrl: string | null;
							customThumbnailTime: number | null;
						}>;
					};
				};
			};
			const typedClient = trpcClient as unknown as GetThumbnailClient;
			return typedClient.mux.getThumbnail.query({
				videoId: videoId || "",
				libraryId: libraryId || "",
			});
		},
		enabled: !!videoId && !!libraryId,
	});

	// Determine effective thumbnail time based on priority:
	// 1. customThumbnailTime from database (if exists)
	// 2. time prop passed to component
	// 3. Default to 5 seconds
	const effectiveThumbnailTime =
		thumbnailData?.customThumbnailTime !== null &&
		thumbnailData?.customThumbnailTime !== undefined
			? thumbnailData.customThumbnailTime
			: (time ?? 5);

	// Priority for thumbnail URL:
	// 1. customThumbnailUrl (direct image URL from database)
	// 2. customThumbnailTime or time prop (Mux-generated thumbnail)
	const customThumbnailUrl = thumbnailData?.customThumbnailUrl;

	// Thumbnail params for signed videos - these get embedded in the JWT token
	const thumbnailParams = {
		time: effectiveThumbnailTime,
		width: finalWidth,
		height: finalHeight,
		fit_mode: "smartcrop" as const,
	};

	// Fetch signed token if the video has a signed policy and we're using Mux thumbnail
	// For signed videos, time/width/height/fit_mode are embedded in the JWT token claims
	const { data: signedTokens, isLoading: isLoadingToken } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokens",
			playbackId,
			libraryId,
			effectiveThumbnailTime,
			thumbnailParams.width,
			thumbnailParams.height,
		],
		queryFn: () =>
			client.mux.generateSignedTokens.query({
				playbackId: playbackId ?? "",
				libraryId,
				expiresIn: 3600,
				thumbnailParams,
			}),
		enabled:
			policy === "signed" && !!playbackId && !!libraryId && !customThumbnailUrl, // Only fetch token if not using custom URL
		staleTime: 60 * 60 * 1000,
	});

	// Generate thumbnail URL based on priority
	// Priority 1: Use custom thumbnail URL if it exists (bypass Mux)
	// Priority 2: Use Mux thumbnail with customThumbnailTime or time prop
	const thumbnailUrl = customThumbnailUrl
		? customThumbnailUrl
		: policy === "signed"
			? getMuxThumbnailUrl(playbackId, {}, signedTokens?.thumbnail)
			: getMuxThumbnailUrl(playbackId, {
					width: finalWidth,
					height: finalHeight,
					fitMode: "smartcrop",
					time: effectiveThumbnailTime,
				});

	// Skeleton classes based on aspect ratio
	const skeletonClass = aspectVideo ? "aspect-video w-full" : "h-full w-full";
	const containerClass = aspectVideo ? "aspect-video" : "h-full w-full";

	// Show fallback if no playbackId or error occurred
	if (!playbackId || hasError) {
		return (
			<div
				className={`w-90 flex items-center justify-center bg-muted ${containerClass}`}
			>
				{fallbackIcon ?? <Film className="size-6 text-muted-foreground" />}
			</div>
		);
	}

	// Show skeleton while loading custom thumbnail data
	if (isLoadingThumbnail) {
		return <Skeleton className={skeletonClass} />;
	}

	// Show skeleton while loading token for signed videos (only if not using custom URL)
	if (
		!customThumbnailUrl &&
		policy === "signed" &&
		(isLoadingToken || !signedTokens?.thumbnail)
	) {
		return <Skeleton className={skeletonClass} />;
	}

	// Should not happen, but handle null URL case
	if (!thumbnailUrl) {
		return <Skeleton className={skeletonClass} />;
	}

	return (
		<div className={`relative ${containerClass}`}>
			{!isLoaded && (
				<Skeleton className={`absolute inset-0 ${skeletonClass}`} />
			)}
			<img
				src={thumbnailUrl}
				alt={alt}
				className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} h-full w-full object-cover transition-opacity duration-200`}
				onLoad={() => setIsLoaded(true)}
				onError={() => setHasError(true)}
			/>
		</div>
	);
}

export default VideoThumbnail;
