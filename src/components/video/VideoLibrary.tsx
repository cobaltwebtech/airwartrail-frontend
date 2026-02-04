/**
 * Video Library Component
 *
 * A read-only, reusable component to display videos from a specific library in grid or table view.
 * Supports infinite scrolling for large video collections.
 *
 * Can optionally require a subscription to view the library.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Film,
	Grid3X3,
	List,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import type {
	SearchVideoResult,
	SearchVideosByTagsInput,
	Video,
	VideoStatus,
	VideoTag,
} from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";
import { formatDuration, formatTimeAgo } from "@/lib/video-helpers";

interface VideoLibraryProps {
	/** The library ID to fetch videos from */
	libraryId: string;
	/** Number of videos to fetch per page */
	pageSize?: number;
	/** Optional initial view mode */
	initialViewMode?: "grid" | "table";
	/** Whether this library requires a subscription to view */
	requiresSub: boolean;
}

type ViewMode = "grid" | "table";

const STORAGE_KEY = "videoLibrary-settings";
const DEFAULT_PAGE_SIZE = 20;

interface VideoLibrarySettings {
	viewMode: ViewMode;
	sortCriteria: string;
	sortDirection: string;
	tableSorting: SortingState;
}

function getStoredSettings(): VideoLibrarySettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				viewMode: parsed.viewMode ?? "grid",
				sortCriteria: parsed.sortCriteria ?? "date",
				sortDirection: parsed.sortDirection ?? "desc",
				tableSorting: parsed.tableSorting ?? [],
			};
		}
	} catch {
		// Ignore parse errors
	}
	return {
		viewMode: "grid",
		sortCriteria: "date",
		sortDirection: "desc",
		tableSorting: [],
	};
}

const formatDate = (date: Date | string | null | undefined): string => {
	if (!date) return "N/A";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

// Read stored settings once at module level
const initialSettings = getStoredSettings();

function VideoLibraryContent({
	libraryId,
	pageSize = DEFAULT_PAGE_SIZE,
	initialViewMode,
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
	const [viewMode, setViewMode] = useState<ViewMode>(
		initialViewMode || initialSettings.viewMode,
	);
	const [tableSorting, setTableSorting] = useState<SortingState>(
		initialSettings.tableSorting,
	);

	// Ref for infinite scroll observer
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
				viewMode,
				sortCriteria,
				sortDirection,
				tableSorting,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		}, 300);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [viewMode, sortCriteria, sortDirection, tableSorting]);

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

	// Infinite scroll observer
	useEffect(() => {
		if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(loadMoreRef.current);

		return () => {
			observer.disconnect();
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

	const handleSortingChange = useCallback(
		(updater: SortingState | ((old: SortingState) => SortingState)) => {
			setTableSorting((old) => {
				const newValue = typeof updater === "function" ? updater(old) : updater;
				return newValue;
			});
		},
		[],
	);

	// Table columns definition
	const columns = useMemo<ColumnDef<Video>[]>(
		() => [
			{
				accessorKey: "thumbnail",
				header: "",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="max-w-25 mx-auto">
						<a href={buildVideoUrl(row.original.id, row.original.title)}>
							<VideoThumbnail
								playbackId={row.original.playbackId}
								alt={row.original.title}
								className="size-full object-cover rounded-md"
								width={160}
								height={90}
								policy={row.original.policy ?? undefined}
								libraryId={libraryId}
								videoId={row.original.id}
							/>
						</a>
					</div>
				),
			},
			{
				accessorKey: "title",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Title
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<a
						href={buildVideoUrl(row.original.id, row.original.title)}
						className="font-semibold text-foreground hover:underline"
					>
						{row.original.title}
					</a>
				),
			},
			{
				accessorKey: "duration",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Duration
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{formatDuration(row.original.duration)}
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Uploaded
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{formatDate(row.original.createdAt)}
					</span>
				),
			},
			{
				accessorKey: "views",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Views
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => (
					<Badge variant="secondary">
						{row.original.views?.toLocaleString() ?? 0}
					</Badge>
				),
			},
		],
		[buildVideoUrl, libraryId],
	);

	const table = useReactTable({
		data: filteredVideos,
		columns,
		state: {
			sorting: tableSorting,
		},
		onSortingChange: handleSortingChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

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
			{/* Search and view mode controls */}
			<div className="flex flex-wrap justify-between gap-2">
				<Input
					placeholder="Search videos..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="max-w-sm"
				/>
				<div className="flex gap-x-2">
					{viewMode === "grid" && (
						<>
							<Select value={sortCriteria} onValueChange={setSortCriteria}>
								<SelectTrigger className="max-w-sm">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="date">Upload Date</SelectItem>
									<SelectItem value="title">Title</SelectItem>
								</SelectContent>
							</Select>
							<Button size="icon" onClick={toggleSortDirection}>
								{sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}
							</Button>
						</>
					)}
					<div className="flex rounded-full border">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={viewMode === "grid" ? "secondary" : "ghost"}
									size="icon"
									onClick={() => setViewMode("grid")}
									className="rounded-r-none"
								>
									<Grid3X3 className="h-4 w-4" />
									<span className="sr-only">Grid view</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Grid View</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={viewMode === "table" ? "secondary" : "ghost"}
									size="icon"
									onClick={() => setViewMode("table")}
									className="rounded-l-none"
								>
									<List className="h-4 w-4" />
									<span className="sr-only">Table view</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Table View</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>

			<VideoTags />

			{isLoading && (
				<div className="text-muted-foreground flex items-center justify-center py-12">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />
					Loading videos...
				</div>
			)}

			{/* Table layout for videos */}
			{!isLoading && viewMode === "table" && (
				<div className="rounded-t-lg border bg-card">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											style={{ width: header.getSize() }}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										No videos found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Grid layout for videos */}
			{!isLoading && viewMode === "grid" && (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredVideos.map((video) => (
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
										<Badge>{video.views?.toLocaleString() ?? 0} views</Badge>
									</CardDescription>
								</CardHeader>
								<CardFooter className="text-muted-foreground p-4 pt-0 text-xs">
									Uploaded {formatTimeAgo(video.createdAt)}
								</CardFooter>
							</Card>
						))}
					</div>

					{/* Infinite scroll trigger */}
					<div ref={loadMoreRef} className="flex justify-center py-4">
						{isFetchingNextPage && (
							<div className="text-muted-foreground flex items-center">
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Loading more videos...
							</div>
						)}
						{!hasNextPage && filteredVideos.length > 0 && (
							<p className="text-muted-foreground text-xs">End of videos</p>
						)}
					</div>
				</>
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
