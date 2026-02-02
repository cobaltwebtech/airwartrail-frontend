/**
 * Playlist Library Component
 *
 * A read-only, reusable component to display playlists from a specific library.
 * Supports grid view with thumbnail previews and video counts.
 */
import { useQuery } from "@tanstack/react-query";
import { Film, Loader2, Play } from "lucide-react";
import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import type { Playlist } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";
import { useSubStatus } from "@/lib/useSubStatus";

interface PlaylistsListProps {
	/** The library ID to fetch playlists from */
	libraryId: string;
}

type ListPlaylistsClient = {
	mux: {
		listPlaylists: {
			query: (input: { libraryId: string }) => Promise<Playlist[]>;
		};
	};
};

function PlaylistsListContent({ libraryId }: PlaylistsListProps) {
	// Check session and subscription status
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();

	const {
		data: playlists,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["mux", "listPlaylists", libraryId],
		queryFn: async () => {
			const client = trpcClient as unknown as ListPlaylistsClient;
			return client.mux.listPlaylists.query({ libraryId });
		},
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
			<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
				<p className="text-destructive">
					Error loading playlists: {error.message}
				</p>
			</div>
		);
	}

	if (isLoading) {
		return <PlaylistGridSkeleton />;
	}

	// Filter to only show published playlists and sort by sortOrder
	const publishedPlaylists =
		playlists
			?.filter((playlist) => playlist.isPublished)
			.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

	if (publishedPlaylists.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-16">
				<Film className="h-16 w-16 text-muted-foreground" />
				<p className="text-lg text-muted-foreground">
					No playlists available yet.
				</p>
			</div>
		);
	}

	return (
		<ItemGroup className="grid gap-8 md:grid-cols-2">
			{publishedPlaylists.map((playlist) => (
				<PlaylistCard
					key={playlist.id}
					playlist={playlist}
					libraryId={libraryId}
				/>
			))}
		</ItemGroup>
	);
}

interface PlaylistCardProps {
	playlist: Playlist;
	libraryId: string;
}

function PlaylistCard({ playlist, libraryId }: PlaylistCardProps) {
	const playlistUrl = `/film-series/${playlist.slug}`;

	return (
		<Item asChild className="bg-accent-6">
			<a href={playlistUrl} className="group">
				<ItemMedia className="w-fit md:basis-1/4 relative overflow-hidden rounded-lg">
					{playlist.thumbnailPlaybackId ? (
						<VideoThumbnail
							playbackId={playlist.thumbnailPlaybackId}
							alt={playlist.name}
							className="size-full object-cover transition-transform group-hover:scale-105"
							aspectVideo
							policy={playlist.thumbnailPolicy ?? "public"}
							libraryId={libraryId}
							time={playlist.thumbnailTime ?? undefined}
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-muted">
							<Film className="h-12 w-12 text-muted-foreground" />
						</div>
					)}
					{/* Play overlay on hover */}
					<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
						<div className="inline-flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
							<Play className="size-6" />
						</div>
					</div>
				</ItemMedia>
				<ItemContent className="grow">
					<ItemTitle className="line-clamp-1 text-lg group-hover:text-accent-foreground">
						{playlist.name}
					</ItemTitle>
					<ItemDescription>
						{playlist.videoCount} {playlist.videoCount === 1 ? "film" : "films"}
					</ItemDescription>
					{playlist.description && (
						<ItemDescription className="mt-2 line-clamp-3">
							{playlist.description}
						</ItemDescription>
					)}
				</ItemContent>
				<ItemContent>
					<Badge variant="secondary" className="capitalize">
						{playlist.category.replace("-", " ")}
					</Badge>
				</ItemContent>
			</a>
		</Item>
	);
}

function PlaylistGridSkeleton() {
	return (
		<ItemGroup className="w-full grid gap-8 sm:grid-cols-2">
			{Array.from({ length: 8 }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items are static
				<Item key={`skeleton-${i}`} variant="outline" className="flex-nowrap">
					<ItemMedia className="w-40 rounded-lg">
						<Skeleton className="aspect-video w-full" />
					</ItemMedia>
					<ItemContent className="flex-1">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-1/2" />
					</ItemContent>
				</Item>
			))}
		</ItemGroup>
	);
}

/**
 * PlaylistsList with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <PlaylistsList client:load libraryId="your-library-id" />
 * ```
 */
export function PlaylistsList(props: PlaylistsListProps) {
	return (
		<QueryProvider showDevtools={false}>
			<PlaylistsListContent {...props} />
		</QueryProvider>
	);
}

export default PlaylistsList;
