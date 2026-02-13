/**
 * Video Library Component
 *
 * A read-only, reusable component to display videos from a specific library
 * in a virtualized grid using TanStack Virtual.
 * Supports infinite scrolling for large video collections.
 *
 * Can optionally require a subscription to view the library.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
	ArrowDown,
	ArrowUp,
	Film,
	Loader2,
	OctagonX,
	Play,
	Tags,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type PrefetchedSignedTokens,
	type PrefetchedThumbnailData,
	VideoThumbnail,
} from "@/components/video/VideoThumbnail";
import type {
	SearchVideoResult,
	SearchVideosByTagsInput,
	Video,
	VideoStatus,
	VideoTag,
} from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";
import {
	formatDuration,
	formatTimeAgo,
	getDefaultThumbnailDimensions,
} from "@/lib/video-helpers";

interface VideoLibraryProps {
	/** The library ID to fetch videos from */
	libraryId: string;
	/** Number of videos to fetch per page */
	pageSize?: number;
	/** Whether this library requires a subscription to view */
	requiresSub: boolean;
}

const STORAGE_KEY = "videoLibrary-settings";
const DEFAULT_PAGE_SIZE = 20;

interface VideoLibrarySettings {
	sortCriteria: string;
	sortDirection: string;
}

function getStoredSettings(): VideoLibrarySettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				sortCriteria: parsed.sortCriteria ?? "date",
				sortDirection: parsed.sortDirection ?? "desc",
			};
		}
	} catch {
		// Ignore parse errors
	}
	return {
		sortCriteria: "date",
		sortDirection: "desc",
	};
}

// Read stored settings once at module level
const initialSettings = getStoredSettings();

function VideoLibraryContent({
	libraryId,
	pageSize = DEFAULT_PAGE_SIZE,
	requiresSub,
}: VideoLibraryProps) {
	// Check session and subscription status only if required
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const checkAuth = requiresSub;

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(() => {
		// Initialize from URL query params (using slugs)
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			const tags = params.get("tags");
			return tags ? tags.split(",").filter(Boolean) : [];
		}
		return [];
	});

	// Initialize state from stored settings
	const [sortCriteria, setSortCriteria] = useState(
		initialSettings.sortCriteria,
	);
	const [sortDirection, setSortDirection] = useState(
		initialSettings.sortDirection,
	);

	// Refs for virtualization
	const gridListRef = useRef<HTMLDivElement>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Track column count for grid virtualization
	const [columnCount, setColumnCount] = useState(4);

	// Update column count based on viewport width
	useEffect(() => {
		if (typeof window === "undefined") return;

		const updateColumnCount = () => {
			const width = window.innerWidth;
			if (width >= 1280)
				setColumnCount(4); // xl
			else if (width >= 1024)
				setColumnCount(3); // lg
			else if (width >= 640)
				setColumnCount(2); // sm
			else setColumnCount(1); // mobile
		};

		updateColumnCount();
		window.addEventListener("resize", updateColumnCount);
		return () => window.removeEventListener("resize", updateColumnCount);
	}, []);

	// Update URL when selected tags change (using slugs)
	useEffect(() => {
		if (typeof window === "undefined") return;

		const params = new URLSearchParams(window.location.search);
		if (selectedTagSlugs.length > 0) {
			params.set("tags", selectedTagSlugs.join(","));
		} else {
			params.delete("tags");
		}

		const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
		window.history.replaceState({}, "", newUrl);
	}, [selectedTagSlugs]);

	// Persist settings to localStorage with debouncing
	useEffect(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			const settings: VideoLibrarySettings = {
				sortCriteria,
				sortDirection,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		}, 300);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [sortCriteria, sortDirection]);

	// Fetch all active tags using the new tag management API
	const {
		data: tagsData,
		isLoading: isLoadingTags,
		error: tagsError,
	} = useQuery({
		queryKey: ["mux", "listTags"],
		queryFn: async () => {
			type ListTagsClient = {
				mux: {
					listTags: {
						query: (input: Record<string, never>) => Promise<VideoTag[]>;
					};
				};
			};
			const client = trpcClient as unknown as ListTagsClient;
			return client.mux.listTags.query({});
		},
	});

	// Map slugs to IDs for API queries
	const selectedTagIds = useMemo(() => {
		if (!tagsData || selectedTagSlugs.length === 0) return [];
		return selectedTagSlugs
			.map((slug) => tagsData.find((tag) => tag.slug === slug)?.id)
			.filter((id): id is string => Boolean(id));
	}, [tagsData, selectedTagSlugs]);

	// Infinite query for videos (filtered by tags if selected)
	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: [
			"mux",
			selectedTagIds.length > 0
				? "searchVideosByTags"
				: "listVideosFromDatabase",
			libraryId,
			pageSize,
			selectedTagIds,
		],
		queryFn: async ({ pageParam = 0 }) => {
			// If tags are selected, use searchVideosByTags
			if (selectedTagIds.length > 0) {
				type SearchVideosClient = {
					mux: {
						searchVideosByTags: {
							query: (
								input: SearchVideosByTagsInput,
							) => Promise<SearchVideoResult[]>;
						};
					};
				};
				const client = trpcClient as unknown as SearchVideosClient;
				const results = await client.mux.searchVideosByTags.query({
					libraryId,
					tagIds: selectedTagIds,
					matchMode: "any", // Show videos with ANY of the selected tags
					limit: pageSize,
					offset: pageParam,
				});
				// Map searchVideosByTags response to Video type with all required fields
				return results.map(
					(result): Video => ({
						id: result.id,
						libraryId: libraryId,
						muxAssetId: "",
						muxPlaybackId: result.muxPlaybackId,
						muxEnvironmentId: null,
						status: (result.status as VideoStatus) ?? "ready",
						errorCategory: null,
						errorMessages: null,
						title: result.title,
						description: result.description ?? null,
						duration: result.duration,
						aspectRatio: null,
						maxWidth: null,
						maxHeight: null,
						maxStoredFrameRate: null,
						resolutionTier: null,
						videoQuality: null,
						playbackId: result.muxPlaybackId,
						policy: result.playbackPolicy,
						isPublished: result.isPublished ?? true,
						publishedAt: null,
						views: result.views ?? 0,
						viewCountSyncedAt: null,
						customThumbnailUrl: null,
						customThumbnailTime: null,
						createdAt: result.createdAt,
						updatedAt: result.createdAt,
					}),
				);
			}

			// Otherwise, list all videos
			type ListVideosClient = {
				mux: {
					listVideosFromDatabase: {
						query: (input: {
							libraryId: string;
							limit?: number;
							offset?: number;
						}) => Promise<Video[]>;
					};
				};
			};
			const client = trpcClient as unknown as ListVideosClient;
			return client.mux.listVideosFromDatabase.query({
				libraryId,
				limit: pageSize,
				offset: pageParam,
			});
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < pageSize) return undefined;
			return allPages.length * pageSize;
		},
	});

	// Flatten all pages into a single array
	const allVideos = useMemo(() => {
		return data?.pages.flat() ?? [];
	}, [data]);

	// Filter and sort videos
	const filteredVideos = useMemo(() => {
		return allVideos
			.filter((video) => video.isPublished === true)
			.filter((video) => video.status === "ready")
			.filter((video) =>
				video.title.toLowerCase().includes(searchTerm.toLowerCase()),
			)
			.sort((a, b) => {
				if (sortCriteria === "title") {
					return sortDirection === "asc"
						? a.title.localeCompare(b.title)
						: b.title.localeCompare(a.title);
				}
				return sortDirection === "asc"
					? new Date(a.createdAt || 0).getTime() -
							new Date(b.createdAt || 0).getTime()
					: new Date(b.createdAt || 0).getTime() -
							new Date(a.createdAt || 0).getTime();
			});
	}, [allVideos, searchTerm, sortCriteria, sortDirection]);
	// Batch fetch thumbnails for all loaded videos
	const videoIdsForThumbnails = useMemo(() => {
		return allVideos.map((v) => v.id);
	}, [allVideos]);

	const { data: thumbnailBatchData } = useQuery({
		queryKey: ["mux", "getThumbnailBatch", libraryId, videoIdsForThumbnails],
		queryFn: async () => {
			if (videoIdsForThumbnails.length === 0) return [];

			type GetThumbnailBatchClient = {
				mux: {
					getThumbnailBatch: {
						query: (input: {
							videoIds: string[];
							libraryId: string;
						}) => Promise<
							{
								videoId: string;
								customThumbnailUrl: string | null;
								customThumbnailTime: number | null;
								hasCustomThumbnail: boolean;
							}[]
						>;
					};
				};
			};
			const client = trpcClient as unknown as GetThumbnailBatchClient;
			return client.mux.getThumbnailBatch.query({
				videoIds: videoIdsForThumbnails,
				libraryId,
			});
		},
		enabled: videoIdsForThumbnails.length > 0,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Create a map for O(1) thumbnail lookup
	const thumbnailMap = useMemo(() => {
		const map = new Map<string, PrefetchedThumbnailData>();
		if (thumbnailBatchData) {
			for (const item of thumbnailBatchData) {
				map.set(item.videoId, {
					customThumbnailUrl: item.customThumbnailUrl,
					customThumbnailTime: item.customThumbnailTime,
				});
			}
		}
		return map;
	}, [thumbnailBatchData]);

	// Get signed videos that need token batch fetching
	// Only fetch tokens for videos that don't have a custom thumbnail URL
	const signedVideoItems = useMemo(() => {
		const dimensions = getDefaultThumbnailDimensions(true); // aspectVideo=true
		return allVideos
			.filter(
				(v): v is Video & { playbackId: string } =>
					v.policy === "signed" && typeof v.playbackId === "string",
			)
			.filter((v) => {
				// Skip videos with custom thumbnail URLs (they don't need Mux tokens)
				const thumbnail = thumbnailMap.get(v.id);
				return !thumbnail?.customThumbnailUrl;
			})
			.map((v) => {
				const thumbnail = thumbnailMap.get(v.id);
				const thumbnailTime = thumbnail?.customThumbnailTime ?? 5;
				return {
					playbackId: v.playbackId,
					expiresIn: 3600,
					thumbnailParams: {
						time: thumbnailTime,
						width: dimensions.width,
						height: dimensions.height,
						fit_mode: "smartcrop",
					},
				};
			});
	}, [allVideos, thumbnailMap]);

	// Batch fetch signed tokens for all signed videos
	const { data: tokenBatchData } = useQuery({
		queryKey: [
			"mux",
			"generateSignedTokensBatch",
			libraryId,
			signedVideoItems.map((i) => i.playbackId),
		],
		queryFn: async () => {
			if (signedVideoItems.length === 0) return [];

			type GenerateSignedTokensBatchClient = {
				mux: {
					generateSignedTokensBatch: {
						query: (input: {
							items: Array<{
								playbackId: string;
								expiresIn?: number;
								thumbnailParams?: {
									time?: number;
									width?: number;
									height?: number;
									fit_mode?: string;
								};
							}>;
							libraryId?: string;
						}) => Promise<
							Array<{
								playbackId: string;
								playback: string;
								thumbnail: string;
								storyboard: string;
							}>
						>;
					};
				};
			};
			const client = trpcClient as unknown as GenerateSignedTokensBatchClient;
			return client.mux.generateSignedTokensBatch.query({
				items: signedVideoItems,
				libraryId,
			});
		},
		// Wait for thumbnail data before fetching tokens to ensure correct filtering
		// (videos with custom URLs don't need tokens, and we need customThumbnailTime for token params)
		enabled: signedVideoItems.length > 0 && !!thumbnailBatchData,
		staleTime: 55 * 60 * 1000, // 55 minutes (tokens expire in 60)
	});

	// Create a map for O(1) token lookup by playbackId
	const tokenMap = useMemo(() => {
		const map = new Map<string, PrefetchedSignedTokens>();
		if (tokenBatchData) {
			for (const item of tokenBatchData) {
				map.set(item.playbackId, {
					playback: item.playback,
					thumbnail: item.thumbnail,
					storyboard: item.storyboard,
				});
			}
		}
		return map;
	}, [tokenBatchData]);

	const toggleSortDirection = () => {
		setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
	};

	const toggleTag = (tagSlug: string) => {
		setSelectedTagSlugs((prev) => {
			if (prev.includes(tagSlug)) {
				// Remove tag
				return prev.filter((slug) => slug !== tagSlug);
			}
			// Add tag
			return [...prev, tagSlug];
		});
	};

	const clearAllTags = () => {
		setSelectedTagSlugs([]);
	};

	const buildVideoUrl = useCallback(
		(videoId: string, title: string) => {
			const prefix = requiresSub ? "premium" : "basic";
			return `/watch/${prefix}/${libraryId}/video/${videoId}?title=${encodeURIComponent(title)}`;
		},
		[libraryId, requiresSub],
	);

	// Grid virtualizer - virtualizes rows of cards
	const gridRowCount = Math.ceil(filteredVideos.length / columnCount);
	const gridVirtualizer = useWindowVirtualizer({
		count: hasNextPage ? gridRowCount + 1 : gridRowCount, // +1 for loader row
		estimateSize: () => 340, // Estimated card height including gap
		overscan: 3,
		scrollMargin: gridListRef.current?.offsetTop ?? 0,
	});

	// Infinite scroll via virtualizer - detect when last item is visible
	useEffect(() => {
		const virtualItems = gridVirtualizer.getVirtualItems();
		const lastItem = virtualItems[virtualItems.length - 1];

		if (!lastItem) return;

		if (
			lastItem.index >= gridRowCount - 1 &&
			hasNextPage &&
			!isFetchingNextPage
		) {
			fetchNextPage();
		}
	}, [
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
		gridRowCount,
		gridVirtualizer,
	]);

	// Show loading state during hydration or auth check (only if auth is required)
	if (checkAuth && (!mounted || authLoading)) {
		return (
			<section className="w-full space-y-6">
				<Skeleton className="h-9 w-96" />
				<Skeleton className="h-38.5 w-full" />
				<div className="relative h-70 w-full mx-auto">
					<Skeleton className="size-full absolute inset-0" />
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
						<Loader2 className="size-8 animate-spin" />
						<span>Loading Videos...</span>
					</div>
				</div>
			</section>
		);
	}

	// Gate content for users without active subscription (only if auth is required)
	if (checkAuth && (!session?.user || !isPremium)) {
		return <Pricing />;
	}

	if (error) {
		// Check for rate limit error
		const trpcError = error as {
			meta?: {
				responseJSON?: {
					error?: { code?: string; message?: string };
				};
			};
		};
		const isRateLimitError =
			trpcError?.meta?.responseJSON?.error?.code === "TOO_MANY_REQUESTS" ||
			trpcError?.meta?.responseJSON?.error?.message?.includes("429");

		if (isRateLimitError) {
			return (
				<div className="w-full mx-auto max-w-md flex flex-col items-center justify-center text-center text-destructive p-4 gap-2">
					<OctagonX className="size-16" />
					<h2 className="text-2xl font-bold">Error 429 - Too Many Requests</h2>
					<p>
						Rate limiting applied. Please wait at least one minute and then
						refresh the page.
					</p>
				</div>
			);
		}

		return (
			<div className="w-full mx-auto max-w-md flex flex-col items-center justify-center text-center text-destructive p-4">
				<OctagonX className="size-16" />
				<h2 className="text-2xl font-bold">Error Loading Videos</h2>
				<p>Try refreshing the page.</p>
			</div>
		);
	}

	const VideoTags = () => {
		if (isLoadingTags) {
			return (
				<Card>
					<CardHeader>
						<h3 className="text-lg font-semibold">Tags</h3>
						<CardDescription className="text-xs">
							Browse videos by category or genre.
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
						<h3 className="text-lg font-semibold">Tags</h3>
						<CardDescription className="text-xs">
							Browse videos by category or genre.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-destructive">Failed to load tags</p>
					</CardContent>
				</Card>
			);
		}

		const activeTags = tagsData ?? [];

		if (activeTags.length === 0) {
			return (
				<Card>
					<CardHeader>
						<h3 className="text-lg font-semibold">Tags</h3>
						<CardDescription className="text-xs">
							Browse videos by category or genre.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">No tags available</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Tags className="size-8" />
						<h3 className="text-lg font-semibold">Tags</h3>
					</div>
					<CardDescription className="text-xs">
						Browse videos by category or genre. Filter videos by selecting tags
						below. You may select multiple tags.
					</CardDescription>
					{selectedTagSlugs.length > 0 && (
						<CardAction>
							<Button
								variant="outline"
								size="sm"
								onClick={clearAllTags}
								className="w-fit"
							>
								Clear Filters ({selectedTagSlugs.length})
							</Button>
						</CardAction>
					)}
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex flex-wrap gap-2">
						{activeTags.map((tag) => {
							const isSelected = selectedTagSlugs.includes(tag.slug);
							return (
								<Badge
									key={tag.id}
									variant={isSelected ? "secondary" : "outline"}
									className="cursor-pointer hover:opacity-80 transition-opacity"
									onClick={() => toggleTag(tag.slug)}
								>
									{tag.name}
								</Badge>
							);
						})}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<section className="w-full space-y-6">
			{/* Search and sort controls */}
			<div className="flex flex-wrap justify-between gap-2">
				<Input
					placeholder="Search videos..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="max-w-sm"
				/>
				<div className="flex gap-x-2">
					<Select value={sortCriteria} onValueChange={setSortCriteria}>
						<SelectTrigger className="max-w-sm">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="date">Upload Date</SelectItem>
							<SelectItem value="title">Title</SelectItem>
						</SelectContent>
					</Select>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="icon" onClick={toggleSortDirection}>
								{sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{sortDirection === "asc" ? "Ascending" : "Descending"}
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<VideoTags />

			{isLoading && (
				<div className="text-muted-foreground flex items-center justify-center py-12">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />
					Loading videos...
				</div>
			)}

			{/* Grid layout for videos - virtualized */}
			{!isLoading && (
				<div ref={gridListRef}>
					<div
						style={{
							height: `${gridVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						{gridVirtualizer.getVirtualItems().map((virtualRow) => {
							const isLoaderRow = virtualRow.index >= gridRowCount;
							const startIndex = virtualRow.index * columnCount;
							const rowVideos = filteredVideos.slice(
								startIndex,
								startIndex + columnCount,
							);

							return (
								<div
									key={virtualRow.index}
									data-index={virtualRow.index}
									ref={gridVirtualizer.measureElement}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										transform: `translateY(${virtualRow.start - gridVirtualizer.options.scrollMargin}px)`,
									}}
								>
									{isLoaderRow ? (
										<div className="flex justify-center py-4">
											{isFetchingNextPage ? (
												<div className="text-muted-foreground flex items-center">
													<Loader2 className="mr-2 h-5 w-5 animate-spin" />
													Loading more videos...
												</div>
											) : (
												<p className="text-muted-foreground text-xs">
													End of videos
												</p>
											)}
										</div>
									) : (
										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
											{rowVideos.map((video) => (
												<Card
													key={video.id}
													className="hover:bg-background transition-colors gap-1 overflow-hidden p-0"
												>
													<a href={buildVideoUrl(video.id, video.title)}>
														<div className="relative">
															<VideoThumbnail
																playbackId={video.playbackId}
																alt={video.title}
																className="aspect-video w-full object-cover"
																aspectVideo
																policy={video.policy ?? undefined}
																libraryId={libraryId}
																videoId={video.id}
																prefetchedThumbnail={thumbnailMap.get(video.id)}
																prefetchedSignedTokens={
																	video.playbackId
																		? tokenMap.get(video.playbackId)
																		: undefined
																}
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
															href={buildVideoUrl(video.id, video.title)}
															className="text-left hover:text-accent-foreground"
														>
															<h3 className="font-semibold line-clamp-2">
																{video.title}
															</h3>
														</a>
														<CardDescription>
															<Badge>
																{video.views?.toLocaleString() ?? 0} views
															</Badge>
														</CardDescription>
													</CardHeader>
													<CardFooter className="text-muted-foreground p-4 pt-0 text-xs">
														Uploaded {formatTimeAgo(video.createdAt)}
													</CardFooter>
												</Card>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
					{/* End of videos message when no more pages */}
					{!hasNextPage && filteredVideos.length > 0 && (
						<div className="flex justify-center py-4">
							<p className="text-muted-foreground text-xs">End of videos</p>
						</div>
					)}
				</div>
			)}

			{filteredVideos.length === 0 && !isLoading && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<Film className="text-muted-foreground mb-4 h-12 w-12" />
					<h3 className="text-lg font-medium">No videos found</h3>
					<p className="text-muted-foreground">
						{searchTerm
							? "Try a different search term"
							: "No videos available in this library yet"}
					</p>
				</div>
			)}
		</section>
	);
}

/**
 * VideoLibrary with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <VideoLibrary client:load libraryId="your-library-id" requiresSub={true} pageSize={20} />
 * <VideoLibrary client:load libraryId="your-library-id" requiresSub={false} pageSize={20} />
 * ```
 */
export function VideoLibrary(props: VideoLibraryProps) {
	return (
		<QueryProvider>
			<VideoLibraryContent {...props} />
		</QueryProvider>
	);
}

export default VideoLibrary;
