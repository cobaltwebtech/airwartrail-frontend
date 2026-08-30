/**
 * Client-side tRPC client for React components
 *
 * This client makes HTTP requests to the Astro API proxy,
 * which forwards them to the CMS Worker via Service Bindings.
 */

import { QueryClient } from "@tanstack/react-query";
import {
	createTRPCClient,
	httpBatchLink,
	splitLink,
	TRPCClientError,
} from "@trpc/client";
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
			staleTime: 1000 * 60 * 15, // Cache data for 15 minutes
			gcTime: 1000 * 60 * 30, // Garbage collect unused data after 30 minutes
			refetchOnWindowFocus: true, // Refetch on window focus for fresh data
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
		},
		mutations: {
			// Don't retry mutations by default
			retry: false,
		},
	},
});

// Procedures that can carry large payloads -> force POST (input in request body).
// tRPC sends queries as GET requests with the serialized input in the URL; when many
// are batched together the URL can exceed Cloudflare's ~8KB limit and return HTTP 431.
const POST_ONLY_PATHS = new Set([
	"mux.getThumbnailBatch",
	"mux.generateSignedTokensBatch",
	"mux.generateSignedTokens",
]);

// Requests go through the Astro API proxy at /api/trpc
const proxyFetch = (input: RequestInfo | URL, options?: RequestInit) =>
	fetch(input, {
		...options,
		// Include credentials for session authentication
		credentials: "include",
	});

/**
 * Raw tRPC client for direct API calls
 * Requests go through the Astro API proxy at /api/trpc
 */
export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			// Send the heavy procedures over POST so the input goes in the body,
			// not the URL (avoids HTTP 431 from oversized GET batches)
			condition: (op) => POST_ONLY_PATHS.has(op.path),
			true: httpBatchLink({
				// Proxy endpoint on the Astro server
				url: "/api/trpc",
				transformer: superjson,
				methodOverride: "POST",
				fetch: proxyFetch,
			}),
			false: httpBatchLink({
				// Proxy endpoint on the Astro server
				url: "/api/trpc",
				transformer: superjson,
				// Safety net: auto-split any oversized GET batch
				maxURLLength: 6000,
				fetch: proxyFetch,
			}),
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
