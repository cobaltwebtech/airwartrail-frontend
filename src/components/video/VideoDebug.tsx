/**
 * Video Debug Component
 *
 * A simple component to test the tRPC connection and display raw video data.
 * Use this to verify the API is working correctly.
 */

import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { Video } from "@/lib/trpc";
import { trpcClient } from "@/lib/trpc";

interface VideoDebugProps {
	/** The library ID to fetch videos from */
	libraryId: string;
	/** Number of videos to fetch */
	limit?: number;
}

function VideoDebugContent({ libraryId, limit = 10 }: VideoDebugProps) {
	// Query videos from the API
	const {
		data: videos,
		isLoading,
		error,
		isFetching,
	} = useQuery({
		queryKey: ["mux", "listVideosFromDatabase", libraryId, limit],
		queryFn: async () => {
			type ListVideosClient = {
				mux: {
					listVideosFromDatabase: {
						query: (input: {
							libraryId: string;
							limit?: number;
						}) => Promise<Video[]>;
					};
				};
			};
			const client = trpcClient as unknown as ListVideosClient;
			return client.mux.listVideosFromDatabase.query({
				libraryId,
				limit,
			});
		},
	});

	// Query libraries to verify connection
	const {
		data: libraries,
		isLoading: librariesLoading,
		error: librariesError,
	} = useQuery({
		queryKey: ["mux", "listLibraries"],
		queryFn: async () => {
			type ListLibrariesClient = {
				mux: {
					listLibraries: {
						query: () => Promise<{ id: string; name: string }[]>;
					};
				};
			};
			const client = trpcClient as unknown as ListLibrariesClient;
			return client.mux.listLibraries.query();
		},
	});

	return (
		<div className="p-4 bg-muted rounded-lg font-mono text-sm">
			<h2 className="text-lg font-bold mb-4">🔧 Video API Debug</h2>

			{/* Libraries Section */}
			<div className="mb-6">
				<h3 className="font-semibold text-primary mb-2">
					Available Libraries:
				</h3>
				{librariesLoading && (
					<p className="text-muted-foreground">Loading libraries...</p>
				)}
				{librariesError && (
					<div className="text-destructive">
						<p className="font-semibold">Libraries Error:</p>
						<pre className="whitespace-pre-wrap text-xs mt-1">
							{librariesError instanceof Error
								? librariesError.message
								: String(librariesError)}
						</pre>
					</div>
				)}
				{libraries && (
					<pre className="bg-background p-2 rounded text-xs overflow-auto max-h-100">
						{JSON.stringify(libraries, null, 2)}
					</pre>
				)}
			</div>

			{/* Videos Section */}
			<div>
				<h3 className="font-semibold text-primary mb-2">
					Videos from Library:{" "}
					<code className="text-accent-foreground">{libraryId}</code>
				</h3>

				{isLoading && (
					<p className="text-muted-foreground">Loading videos...</p>
				)}
				{isFetching && !isLoading && (
					<p className="text-muted-foreground">Refetching...</p>
				)}

				{error && (
					<div className="text-destructive">
						<p className="font-semibold">Videos Error:</p>
						<pre className="whitespace-pre-wrap text-xs mt-1">
							{error instanceof Error ? error.message : String(error)}
						</pre>
					</div>
				)}

				{videos && (
					<div>
						<p className="text-muted-foreground mb-2">
							Found {videos.length} video(s)
						</p>
						<p className="text-xs text-muted-foreground mb-2">
							💡 Use <code className="bg-background px-1">muxPlaybackId</code>{" "}
							(or <code className="bg-background px-1">playbackId</code>) for
							the video player
						</p>
						<pre className="bg-background p-2 rounded text-xs overflow-auto max-h-96">
							{JSON.stringify(
								videos.map((v) => ({
									id: v.id,
									title: v.title,
									muxPlaybackId: v.muxPlaybackId,
									playbackId: v.playbackId,
									status: v.status,
									duration: v.duration,
									policy: v.policy,
								})),
								null,
								2,
							)}
						</pre>
						{/* Show first video's full data for debugging */}
						{videos[0] && (
							<details className="mt-4">
								<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
									📋 Full data for first video
								</summary>
								<pre className="bg-background p-2 rounded text-xs overflow-auto max-h-150 mt-2">
									{JSON.stringify(videos[3], null, 2)}
								</pre>
							</details>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * VideoDebug with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <VideoDebug client:load libraryId="your-library-id" />
 * ```
 */
export function VideoDebug(props: VideoDebugProps) {
	return (
		<QueryProvider>
			<VideoDebugContent {...props} />
		</QueryProvider>
	);
}

export default VideoDebug;
