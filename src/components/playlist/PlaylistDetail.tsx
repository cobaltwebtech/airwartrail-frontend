/**
 * Playlist Detail Component
 *
 * Displays a single playlist with all its videos in grid or table view.
 * Supports sorting, searching, and view mode preferences.
 */

import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pricing } from "@/components/partials/Pricing";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import type { Playlist, PlaylistVideo } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";
import { formatDuration, formatTimeAgo } from "@/lib/video-helpers";

interface PlaylistDetailProps {
	/** The playlist slug to fetch */
	slug: string;
	/** The library ID */
	libraryId: string;
}

type ViewMode = "grid" | "table";

const STORAGE_KEY = "playlistDetail-settings";

interface PlaylistDetailSettings {
	viewMode: ViewMode;
	sortCriteria: string;
	sortDirection: string;
	tableSorting: SortingState;
}

function getStoredSettings(): PlaylistDetailSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				viewMode: parsed.viewMode ?? "grid",
				sortCriteria: parsed.sortCriteria ?? "order",
				sortDirection: parsed.sortDirection ?? "asc",
				tableSorting: parsed.tableSorting ?? [],
			};
		}
	} catch {
		// Ignore parse errors
	}
	return {
		viewMode: "grid",
		sortCriteria: "order",
		sortDirection: "asc",
		tableSorting: [],
	};
}

const initialSettings = getStoredSettings();

type GetPlaylistClient = {
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
	};
};

function PlaylistDetailContent({ slug, libraryId }: PlaylistDetailProps) {
	// Check session and subscription status
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();

	const [searchTerm, setSearchTerm] = useState("");
	const [sortCriteria, setSortCriteria] = useState(
		initialSettings.sortCriteria,
	);
	const [sortDirection, setSortDirection] = useState(
		initialSettings.sortDirection,
	);
	const [viewMode, setViewMode] = useState<ViewMode>(initialSettings.viewMode);
	const [tableSorting, setTableSorting] = useState<SortingState>(
		initialSettings.tableSorting,
	);

	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Fetch playlist with videos
	const {
		data: playlist,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["mux", "getPlaylist", libraryId, slug],
		queryFn: async () => {
			const client = trpcClient as unknown as GetPlaylistClient;
			return client.mux.getPlaylist.query({
				libraryId,
				slug,
				includeVideos: true,
			});
		},
	});

	// Persist settings to localStorage with debouncing
	useEffect(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			const settings: PlaylistDetailSettings = {
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

	// Filter and sort videos
	const filteredVideos = useMemo(() => {
		const videos = playlist?.videos ?? [];
		return videos
			.filter((video) => video.isPublished === true)
			.filter((video) => video.status === "ready")
			.filter((video) => {
				const title = video.customTitle || video.title;
				return title.toLowerCase().includes(searchTerm.toLowerCase());
			})
			.sort((a, b) => {
				const multiplier = sortDirection === "asc" ? 1 : -1;
				if (sortCriteria === "order") {
					return (a.sortOrder - b.sortOrder) * multiplier;
				}
				if (sortCriteria === "title") {
					const titleA = a.customTitle || a.title;
					const titleB = b.customTitle || b.title;
					return titleA.localeCompare(titleB) * multiplier;
				}
				return 0;
			});
	}, [playlist?.videos, searchTerm, sortCriteria, sortDirection]);

	const toggleSortDirection = () => {
		setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
	};

	const buildVideoUrl = useCallback(
		(videoId: string) => {
			// Find the index of this video in the filtered list
			const videoIndex = filteredVideos.findIndex((v) => v.id === videoId);
			// If found in playlist, link to playlist player with video index
			if (videoIndex >= 0 && slug) {
				return `/watch/playlist/${slug}?sort_order=${videoIndex}`;
			}
			// Fallback to individual video player
			return `/watch/library_${libraryId}/${videoId}`;
		},
		[libraryId, slug, filteredVideos],
	);

	const handleSortingChange = useCallback(
		(updater: SortingState | ((old: SortingState) => SortingState)) => {
			setTableSorting((old) => {
				return typeof updater === "function" ? updater(old) : updater;
			});
		},
		[],
	);

	// Table columns definition
	const columns = useMemo<ColumnDef<PlaylistVideo>[]>(
		() => [
			{
				accessorKey: "thumbnail",
				header: "",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="max-w-25 mx-auto">
						<VideoThumbnail
							playbackId={row.original.muxPlaybackId}
							alt={row.original.customTitle || row.original.title}
							className="aspect-video w-full rounded object-cover"
							aspectVideo
							policy={row.original.playbackPolicy ?? "public"}
							libraryId={libraryId}
							time={5}
						/>
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
						href={buildVideoUrl(row.original.id)}
						className="font-semibold text-foreground hover:underline"
					>
						{row.original.customTitle || row.original.title}
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
						{formatDuration(row.original.duration ?? 0)}
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
						{formatTimeAgo(row.original.createdAt)}
					</span>
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

	// Show loading state during hydration or auth check
	if (!mounted || authLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Gate content for users without active subscription
	if (!session?.user || !isPremium) {
		return <Pricing />;
	}

	if (error) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-4 text-center text-destructive">
				<OctagonX className="size-12" />
				<p>Error Loading Playlist</p>
				<p>Try refreshing the page.</p>
			</div>
		);
	}

	if (isLoading) {
		return <PlaylistDetailSkeleton />;
	}

	if (!playlist || !playlist.isPublished) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-16">
				<Film className="h-16 w-16 text-muted-foreground" />
				<p className="text-lg text-muted-foreground">Playlist not found.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Playlist header */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="capitalize">
						{playlist.category.replace("-", " ")}
					</Badge>
					<Badge variant="secondary">
						{playlist.videoCount} {playlist.videoCount === 1 ? "film" : "films"}
					</Badge>
				</div>
				<h1 className="text-3xl font-bold">{playlist.name}</h1>
				{playlist.description && (
					<p className="text-muted-foreground">{playlist.description}</p>
				)}
			</div>

			{/* Controls */}
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
									<SelectItem value="order">Playlist Order</SelectItem>
									<SelectItem value="title">Title</SelectItem>
								</SelectContent>
							</Select>
							<Button size="icon" onClick={toggleSortDirection}>
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

			{/* Table layout */}
			{viewMode === "table" && (
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

			{/* Grid layout */}
			{viewMode === "grid" && (
				<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{filteredVideos.map((video) => (
						<Card
							key={video.id}
							className="gap-1 overflow-hidden p-0 transition-colors hover:bg-background"
						>
							<div className="relative">
								<VideoThumbnail
									playbackId={video.muxPlaybackId}
									alt={video.customTitle || video.title}
									className="aspect-video w-full object-cover"
									aspectVideo
									thumbnailTime={5}
									policy={video.playbackPolicy ?? "public"}
									libraryId={libraryId}
								/>
								<div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
									<a
										href={buildVideoUrl(video.id)}
										className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
									>
										<Play className="size-6" />
									</a>
								</div>
								<div className="absolute bottom-2 right-2 rounded bg-black/70 p-1 text-xs text-white">
									{formatDuration(video.duration ?? 0)}
								</div>
							</div>
							<CardHeader className="flex items-center justify-between p-4">
								<a
									href={buildVideoUrl(video.id)}
									className="text-left hover:text-accent-foreground"
								>
									<h3 className="line-clamp-2 font-semibold">
										{video.customTitle || video.title}
									</h3>
								</a>
								{video.customDescription && (
									<CardDescription className="mt-2 line-clamp-2">
										{video.customDescription}
									</CardDescription>
								)}
							</CardHeader>
							<CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
								Uploaded {formatTimeAgo(video.createdAt)}
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			{filteredVideos.length === 0 && (
				<div className="flex flex-col items-center justify-center gap-4 py-16">
					<Film className="h-16 w-16 text-muted-foreground" />
					<p className="text-lg text-muted-foreground">
						No videos found in this playlist.
					</p>
				</div>
			)}
		</div>
	);
}

function PlaylistDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-24" />
				</div>
				<Skeleton className="h-10 w-2/3" />
				<Skeleton className="h-6 w-full" />
			</div>

			{/* Controls skeleton */}
			<div className="flex justify-between gap-2">
				<Skeleton className="h-10 w-64" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-20" />
				</div>
			</div>

			{/* Grid skeleton */}
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items are static
					<Card key={`skeleton-${i}`} className="overflow-hidden p-0">
						<Skeleton className="aspect-video w-full" />
						<CardHeader className="p-4">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="mt-2 h-4 w-full" />
						</CardHeader>
						<CardFooter className="p-4 pt-0">
							<Skeleton className="h-4 w-24" />
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}

/**
 * PlaylistDetail with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <PlaylistDetail client:load slug="playlist-slug" libraryId="your-library-id" />
 * ```
 */
export function PlaylistDetail(props: PlaylistDetailProps) {
	return (
		<QueryProvider showDevtools={false}>
			<PlaylistDetailContent {...props} />
		</QueryProvider>
	);
}

export default PlaylistDetail;
