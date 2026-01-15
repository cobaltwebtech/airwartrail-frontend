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
	playbackId: string | null | undefined;
	alt: string;
	className?: string;
	aspectVideo?: boolean;
	width?: number;
	height?: number;
	policy?: "public" | "signed";
	libraryId?: string;
	/** Time in seconds to capture the thumbnail from (floats allowed) */
	time?: number;
	/** Optional alias for time to avoid prop name collisions */
	thumbnailTime?: number;
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
	time,
	thumbnailTime,
	fallbackIcon,
}: VideoThumbnailProps) {
	const client = trpcClient as unknown as TypedTrpcClient;
	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const timeInSeconds = thumbnailTime ?? time;

	const defaultDimensions = getDefaultThumbnailDimensions(aspectVideo);
	const finalWidth = width ?? defaultDimensions.width;
	const finalHeight = height ?? defaultDimensions.height;

	const thumbnailParams = {
		time: timeInSeconds,
		width: finalWidth,
		height: finalHeight,
		fit_mode: "smartcrop" as const,
	};

	const { data: signedTokens, isLoading: isLoadingToken } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokens",
			playbackId,
			libraryId,
			timeInSeconds,
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
		enabled: policy === "signed" && !!playbackId && !!libraryId,
		staleTime: 60 * 60 * 1000,
	});

	const thumbnailUrl =
		policy === "signed"
			? getMuxThumbnailUrl(playbackId, {}, signedTokens?.thumbnail)
			: getMuxThumbnailUrl(playbackId, {
					width: finalWidth,
					height: finalHeight,
					fitMode: "smartcrop",
					time: timeInSeconds,
				});

	const skeletonClass = aspectVideo ? "aspect-video w-full" : "h-full w-full";
	const containerClass = aspectVideo ? "aspect-video" : "h-full w-full";

	if (!playbackId || hasError) {
		return (
			<div
				className={`flex items-center justify-center bg-muted ${containerClass}`}
			>
				{fallbackIcon ?? <Film className="size-6 text-muted-foreground" />}
			</div>
		);
	}

	if (policy === "signed" && (isLoadingToken || !signedTokens?.thumbnail)) {
		return <Skeleton className={skeletonClass} />;
	}

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
