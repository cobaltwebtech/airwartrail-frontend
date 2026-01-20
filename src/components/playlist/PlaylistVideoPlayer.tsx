/**
 * Playlist Video Player Component
 *
 * A YouTube-style playlist player that plays videos sequentially without page navigation.
 * Displays the current video with a sidebar showing all playlist videos.
 * Supports auto-advance, manual selection, and signed token handling.
 */

import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";
import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Hourglass, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Item, ItemContent, ItemHeader, ItemMedia } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import type { Playlist, PlaylistVideo, SignedTokens } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/video-helpers";

interface PlaylistVideoPlayerProps {
	/** The playlist slug to fetch */
	slug?: string;
	/** Or pass the playlist directly */
	playlist?: Playlist & { videos: PlaylistVideo[] };
	/** The library ID */
	libraryId: string;
	/** Optional: Start at a specific video index */
	startIndex?: number;
}

type TypedTrpcClient = {
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

function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDescription(description?: string): string[] {
	if (!description) return [];
	return description.split("\n").filter((p) => p.trim().length > 0);
}

function PlaylistVideoPlayerContent({
	slug,
	playlist: providedPlaylist,
	libraryId,
	startIndex = 0,
}: PlaylistVideoPlayerProps) {
	const client = trpcClient as unknown as TypedTrpcClient;
	const playerRef = useRef<MuxPlayerRefAttributes | null>(null);
	const setPlayerRef = (node: unknown) => {
		playerRef.current = node as MuxPlayerRefAttributes | null;
	};

	// Read video index from URL query parameter on mount
	const getInitialIndex = () => {
		if (typeof window === "undefined") return startIndex;
		const params = new URLSearchParams(window.location.search);
		const videoParam = params.get("sort_order");
		if (videoParam) {
			const index = parseInt(videoParam, 10);
			if (!Number.isNaN(index) && index >= 0) {
				return index;
			}
		}
		return startIndex;
	};

	// State for current video index
	const [currentVideoIndex, setCurrentVideoIndex] = useState(getInitialIndex);

	// Fetch playlist if not provided
	const {
		data: fetchedPlaylist,
		isLoading: playlistLoading,
		error: playlistError,
	} = useQuery({
		queryKey: ["mux", "getPlaylist", libraryId, slug],
		queryFn: () =>
			client.mux.getPlaylist.query({
				libraryId,
				slug,
				includeVideos: true,
			}),
		enabled: !providedPlaylist && Boolean(slug),
	});

	const playlist = providedPlaylist || fetchedPlaylist;

	// Filter to ready and published videos, sorted by order
	const playableVideos =
		playlist?.videos
			?.filter((v) => v.isPublished && v.status === "ready")
			.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

	const currentVideo = playableVideos[currentVideoIndex];

	// Fetch signed tokens for current video if needed
	const { data: tokens, isLoading: tokensLoading } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokens",
			currentVideo?.muxPlaybackId,
			libraryId,
		],
		queryFn: () =>
			client.mux.generateSignedTokens.query({
				playbackId: currentVideo?.muxPlaybackId || "",
				libraryId,
				expiresIn: 3600,
				thumbnailParams: {
					time: 5,
				},
			}),
		enabled:
			currentVideo?.playbackPolicy === "signed" &&
			Boolean(currentVideo?.muxPlaybackId),
	});

	// Auto-advance to next video when current one ends
	useEffect(() => {
		const player = playerRef.current;
		if (!player) return;

		const handleEnded = () => {
			// If not the last video, advance to next
			if (currentVideoIndex < playableVideos.length - 1) {
				setCurrentVideoIndex((prev) => prev + 1);
			}
		};

		player.addEventListener("ended", handleEnded);

		return () => {
			player.removeEventListener("ended", handleEnded);
		};
	}, [currentVideoIndex, playableVideos.length]);

	// Scroll to current video in playlist
	const currentVideoRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (currentVideoRef.current) {
			currentVideoRef.current.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			});
		}
	});

	const handleVideoSelect = useCallback((index: number) => {
		setCurrentVideoIndex(index);
		// Update URL query parameter without page reload
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("video", index.toString());
			window.history.replaceState({}, "", url);
		}
	}, []);

	if (playlistLoading) {
		return <PlaylistPlayerSkeleton />;
	}

	if (playlistError || !playlist) {
		return (
			<div className="mx-auto w-fit">
				<Card className="bg-destructive">
					<CardHeader>
						<CardTitle>Error Loading Playlist</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-destructive-foreground">
							{playlistError?.message || "Playlist not found"}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (playableVideos.length === 0) {
		return (
			<div className="mx-auto w-fit">
				<Card>
					<CardHeader>
						<CardTitle>No Videos Available</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							This playlist doesn't have any videos ready to play yet.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!currentVideo) {
		return (
			<div className="mx-auto w-fit">
				<Card className="bg-destructive">
					<CardHeader>
						<CardTitle>Video Not Found</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-destructive-foreground">
							The requested video could not be found in this playlist.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (currentVideo.playbackPolicy === "signed" && tokensLoading) {
		return <PlaylistPlayerSkeleton />;
	}

	const descriptionParagraphs = formatDescription(
		currentVideo.description || currentVideo.customDescription || undefined,
	);

	return (
		<section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
			{/* Main Video Player */}
			<div className="space-y-4">
				<Card className="pt-0">
					<MuxPlayer
						ref={setPlayerRef}
						playbackId={currentVideo.muxPlaybackId || undefined}
						title={currentVideo.customTitle || currentVideo.title}
						accentColor="#ffd02d"
						className="w-full aspect-video rounded-lg overflow-hidden"
						thumbnailTime={
							currentVideo.playbackPolicy === "signed" ? undefined : 5
						}
						tokens={
							currentVideo.playbackPolicy === "signed" && tokens
								? {
										playback: tokens.playback,
										thumbnail: tokens.thumbnail,
										storyboard: tokens.storyboard,
									}
								: undefined
						}
					/>
					<CardHeader>
						<CardTitle className="text-2xl">
							{currentVideo.customTitle || currentVideo.title}
						</CardTitle>
						<CardDescription className="flex items-center gap-4 text-sm text-primary-foreground">
							<div className="flex items-center gap-1 bg-primary px-2 py-1 rounded-md w-fit">
								<Hourglass className="size-4" />
								{formatDuration(currentVideo.duration ?? 0)}
							</div>
							<p>Uploaded {formatTimeAgo(currentVideo.createdAt)}</p>
						</CardDescription>
						<CardAction>
							<Badge>
								Film {currentVideoIndex + 1} of {playableVideos.length}
							</Badge>
						</CardAction>
					</CardHeader>
					{descriptionParagraphs.length > 0 && (
						<CardContent className="space-y-2 font-light text-sm text-pretty">
							{descriptionParagraphs.map((paragraph, idx) => (
								<p key={`${currentVideo.id}-paragraph-${idx}`}>{paragraph}</p>
							))}
						</CardContent>
					)}
				</Card>

				{/* Navigation Buttons */}
				<div className="flex items-center justify-between">
					<Button
						variant="secondary"
						disabled={currentVideoIndex === 0}
						onClick={() => setCurrentVideoIndex((prev) => prev - 1)}
					>
						&larr; Previous Film
					</Button>
					<Button
						variant="secondary"
						disabled={currentVideoIndex === playableVideos.length - 1}
						onClick={() => setCurrentVideoIndex((prev) => prev + 1)}
					>
						Next Film &rarr;
					</Button>
				</div>
			</div>

			{/* Playlist Sidebar */}
			<aside>
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<CardTitle className="text-lg">{playlist.name}</CardTitle>
							<Badge variant="secondary" className="ml-2">
								{playableVideos.length}{" "}
								{playableVideos.length === 1 ? "film" : "films"}
							</Badge>
						</div>
						{playlist.description && (
							<CardDescription className="text-sm text-muted-foreground">
								{playlist.description}
							</CardDescription>
						)}
					</CardHeader>
					<ScrollArea className="h-100 w-full border-t" data-lenis-prevent>
						<CardContent className="space-y-2 p-4">
							{playableVideos.map((video, index) => (
								<Item
									variant="accent"
									key={video.id}
									ref={index === currentVideoIndex ? currentVideoRef : null}
									className={cn(
										"group cursor-pointer transition-colors",
										index === currentVideoIndex && "bg-accent-6",
									)}
									onClick={() => handleVideoSelect(index)}
									role="button"
									tabIndex={0}
								>
									{index === currentVideoIndex && (
										<ItemHeader className="font-light text-xs">
											Now Playing
										</ItemHeader>
									)}
									{/* Thumbnail */}
									<ItemMedia className="relative w-fit flex-none overflow-hidden rounded">
										<VideoThumbnail
											playbackId={video.muxPlaybackId}
											alt={video.customTitle || video.title}
											className="size-full max-w-25 aspect-video object-cover"
											aspectVideo
											policy={video.playbackPolicy ?? "public"}
											libraryId={libraryId}
											time={5}
										/>
										{/* Duration badge */}
										<div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-xs text-white">
											{formatDuration(video.duration ?? 0)}
										</div>
									</ItemMedia>

									{/* Video Info */}
									<ItemContent className="flex-1 min-w-0">
										<div className="flex items-start gap-1">
											<span className="flex-none text-sm text-muted-foreground">
												{index + 1}.
											</span>
											<div className="flex-1 min-w-0">
												<h4
													className={cn(
														"text-sm font-medium line-clamp-2 group-hover:text-accent-foreground",
														index === currentVideoIndex &&
															"text-accent-foreground font-semibold",
													)}
												>
													{video.customTitle || video.title}
												</h4>
											</div>
										</div>
									</ItemContent>

									{/* Current indicator */}
									{index === currentVideoIndex && (
										<div className="relative p-1 bg-primary-foreground rounded-full">
											<div className="absolute inset-0 rounded-full bg-primary-foreground animate-ping"></div>
											<Play className="relative size-3 text-background fill-background" />
										</div>
									)}
								</Item>
							))}
						</CardContent>
					</ScrollArea>
				</Card>
			</aside>
		</section>
	);
}

function PlaylistPlayerSkeleton() {
	return (
		<section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
			<div className="space-y-4">
				<Card className="pt-0">
					<Skeleton className="w-full aspect-video rounded-lg" />
					<CardHeader>
						<Skeleton className="h-8 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full mt-2" />
					</CardContent>
				</Card>
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-3/4" />
					<Skeleton className="h-4 w-full mt-2" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
							<div key={key} className="flex gap-3">
								<Skeleton className="w-32 aspect-video rounded" />
								<div className="flex-1">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-2/3 mt-2" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</section>
	);
}

/**
 * PlaylistVideoPlayer with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <PlaylistVideoPlayer
 *   client:load
 *   slug="playlist-slug"
 *   libraryId="your-library-id"
 *   startIndex={0}
 * />
 * ```
 */
export function PlaylistVideoPlayer(props: PlaylistVideoPlayerProps) {
	return (
		<QueryProvider showDevtools={false}>
			<PlaylistVideoPlayerContent {...props} />
		</QueryProvider>
	);
}

export default PlaylistVideoPlayer;
