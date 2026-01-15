/**
 * Client-side tRPC client for React components
 *
 * This client makes HTTP requests to the Astro API proxy,
 * which forwards them to the CMS Worker via Service Bindings.
 */

import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import type { AppRouter } from "./types";

/**
 * Query client for TanStack Query
 * Configured with sensible defaults for video streaming app
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Data stays fresh for 5 minutes
			staleTime: 1000 * 60 * 5,
			// Retry failed requests up to 3 times
			retry: (failureCount, error) => {
				// Don't retry rate limit errors
				if (error instanceof TRPCClientError) {
					if (error.data?.code === "TOO_MANY_REQUESTS") {
						return false;
					}
					// Don't retry unauthorized errors
					if (error.data?.code === "UNAUTHORIZED") {
						return false;
					}
				}
				return failureCount < 3;
			},
			// Refetch on window focus for fresh data
			refetchOnWindowFocus: true,
		},
		mutations: {
			// Don't retry mutations by default
			retry: false,
		},
	},
});

/**
 * Raw tRPC client for direct API calls
 * Requests go through the Astro API proxy at /api/trpc
 */
export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			// Proxy endpoint on the Astro server
			url: "/api/trpc",
			transformer: superjson,
			fetch(url, options) {
				return fetch(url, {
					...options,
					// Include credentials for session authentication
					credentials: "include",
				});
			},
		}),
	],
});

/**
 * TanStack Query integration for React components
 *
 * @example
 * ```tsx
 * import { useQuery } from '@tanstack/react-query';
 * import { trpc } from '../lib/trpc/client';
 *
 * function VideoList({ libraryId }: { libraryId: string }) {
 *   const { data: videos, isLoading } = useQuery(
 *     trpc.mux.listVideosFromDatabase.queryOptions({
 *       libraryId,
 *       limit: 20,
 *     })
 *   );
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <ul>
 *       {videos?.map(video => (
 *         <li key={video.id}>{video.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});

// Re-export types for convenience
export type { AppRouter } from "./types";
