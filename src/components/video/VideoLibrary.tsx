/**
 * Video Library Component
 *
 * A read-only, reusable component to display videos from a specific library in grid or table view.
 * Supports infinite scrolling for large video collections.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CheckCircle,
	Film,
	Grid3X3,
	List,
	Loader2,
	Play,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Video } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";

interface VideoLibraryProps {
	/** The library ID to fetch videos from */
	libraryId: string;
	/** Number of videos to fetch per page */
	pageSize?: number;
	/** Optional initial view mode */
	initialViewMode?: "grid" | "table";
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

// Helper functions
const formatDuration = (seconds: number | null | undefined): string => {
	if (!seconds) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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

interface VideoThumbnailProps {
	playbackId: string | null;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	aspectVideo?: boolean;
	policy?: "public" | "signed";
	libraryId: string;
}

// VideoThumbnail component for displaying Mux video thumbnails
function VideoThumbnail({
	playbackId,
	alt,
	className,
	width = 320,
	height = 180,
}: VideoThumbnailProps) {
	if (!playbackId) {
		return (
			<div className={`${className} bg-muted flex items-center justify-center`}>
				<Film className="h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}&height=${height}&fit_mode=pad`;

	return (
		<img src={thumbnailUrl} alt={alt} className={className} loading="lazy" />
	);
}

function VideoLibraryContent({
	libraryId,
	pageSize = DEFAULT_PAGE_SIZE,
	initialViewMode,
}: VideoLibraryProps) {
	const [searchTerm, setSearchTerm] = useState("");

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

	// Infinite query for videos
	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["mux", "listVideosFromDatabase", libraryId, pageSize],
		queryFn: async ({ pageParam = 0 }) => {
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
		// Poll every 5 seconds while any video is processing
		refetchInterval: (query) => {
			const allVideos = query.state.data?.pages.flat() ?? [];
			const hasProcessingVideos = allVideos.some(
				(video) => video.status !== "ready" && video.status !== "errored",
			);
			return hasProcessingVideos ? 5000 : false;
		},
	});

	// Flatten all pages into a single array
	const allVideos = useMemo(() => {
		return data?.pages.flat() ?? [];
	}, [data]);

	// Filter and sort videos
	const filteredVideos = useMemo(() => {
		return allVideos
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

	const handleSelectVideo = useCallback((video: Video) => {
		// TODO: Implement video player dialog
		console.log("Selected video:", video);
	}, []);

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
				size: 80,
				enableSorting: false,
				cell: ({ row }) => (
					<button
						type="button"
						onClick={() => handleSelectVideo(row.original)}
						className="relative h-12 w-20 overflow-hidden rounded focus:outline-none focus:ring-2 focus:ring-primary"
					>
						<VideoThumbnail
							playbackId={row.original.playbackId}
							alt={row.original.title}
							className="h-full w-full object-cover"
							width={160}
							height={90}
							policy={row.original.policy ?? undefined}
							libraryId={libraryId}
						/>
					</button>
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
					<button
						type="button"
						onClick={() => handleSelectVideo(row.original)}
						className="font-medium text-left hover:underline focus:outline-none focus:underline"
					>
						{row.original.title}
					</button>
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
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = row.original.status;
					return (
						<Badge
							variant={
								status === "ready"
									? "default"
									: status === "errored"
										? "destructive"
										: "secondary"
							}
							className="gap-1"
						>
							{status === "ready" && <CheckCircle className="size-3" />}
							{status === "errored" && <AlertCircle className="size-3" />}
							{status === "preparing" && (
								<Loader2 className="size-3 animate-spin" />
							)}
							{status === "ready"
								? "Ready"
								: status === "errored"
									? "Error"
									: "Processing"}
						</Badge>
					);
				},
			},
			{
				accessorKey: "isPublished",
				header: "Visibility",
				cell: ({ row }) => (
					<Badge variant={row.original.isPublished ? "default" : "secondary"}>
						{row.original.isPublished ? "Published" : "Unpublished"}
					</Badge>
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
		],
		[handleSelectVideo, libraryId],
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

	if (error) {
		return (
			<div className="text-destructive p-4">
				Error loading videos:{" "}
				{error instanceof Error ? error.message : String(error)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between gap-2">
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
							<Button onClick={toggleSortDirection}>
								{sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}
							</Button>
						</>
					)}
					<div className="flex rounded-md border">
						<Button
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="icon"
							onClick={() => setViewMode("grid")}
							className="rounded-r-none"
						>
							<Grid3X3 className="h-4 w-4" />
							<span className="sr-only">Grid view</span>
						</Button>
						<Button
							variant={viewMode === "table" ? "secondary" : "ghost"}
							size="icon"
							onClick={() => setViewMode("table")}
							className="rounded-l-none"
						>
							<List className="h-4 w-4" />
							<span className="sr-only">Table view</span>
						</Button>
					</div>
				</div>
			</div>

			{/* TODO: Add video player dialog when selectedVideo is set */}

			{isLoading && (
				<div className="text-muted-foreground flex items-center justify-center py-12">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />
					Loading videos...
				</div>
			)}

			{!isLoading && viewMode === "table" && (
				<div className="rounded-md border">
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

			{!isLoading && viewMode === "grid" && (
				<>
					<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{filteredVideos.map((video) => (
							<Card key={video.id} className="gap-2 overflow-hidden pt-0 pb-2">
								<div className="relative">
									<VideoThumbnail
										playbackId={video.playbackId}
										alt={video.title}
										className="aspect-video w-full object-cover"
										aspectVideo
										policy={video.policy ?? undefined}
										libraryId={libraryId}
									/>
									<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
										<Button
											variant="secondary"
											size="icon"
											onClick={() => handleSelectVideo(video)}
										>
											<Play className="h-6 w-6" />
										</Button>
									</div>
									<div className="absolute right-2 bottom-2 rounded bg-black/70 px-1 text-xs text-white">
										{formatDuration(video.duration)}
									</div>
								</div>
								<CardHeader className="p-4">
									<button
										type="button"
										onClick={() => handleSelectVideo(video)}
										className="text-left cursor-pointer group"
									>
										<h3 className="font-semibold line-clamp-2 group-hover:underline">
											{video.title}
										</h3>
									</button>
									<CardDescription>
										<div className="space-y-1">
											<div className="flex items-center gap-2 text-xs">
												<Badge variant="secondary">
													{video.views?.toLocaleString() ?? 0} views
												</Badge>
												<Badge
													variant={
														video.status === "ready"
															? "default"
															: video.status === "errored"
																? "destructive"
																: "secondary"
													}
												>
													{video.status === "ready"
														? "Ready"
														: video.status === "errored"
															? "Error"
															: "Processing"}
												</Badge>
											</div>
											{video.isPublished && (
												<Badge variant="default" className="text-xs">
													Published
												</Badge>
											)}
										</div>
									</CardDescription>
								</CardHeader>
								<CardFooter className="text-muted-foreground p-4 pt-0 text-xs">
									Uploaded on {formatDate(video.createdAt)}
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
							<p className="text-muted-foreground text-sm">
								No more videos to load
							</p>
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
		</div>
	);
}

/**
 * VideoLibrary with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <VideoLibrary client:load libraryId="your-library-id" pageSize={20} />
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
