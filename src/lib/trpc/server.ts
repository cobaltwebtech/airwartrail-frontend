/**
 * Server-side tRPC client using Cloudflare Service Bindings
 *
 * Use this client in:
 * - Astro pages (.astro files)
 * - API routes (src/pages/api/*.ts)
 * - Server-side components
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./types";

/**
 * Create a tRPC client that uses Service Bindings for server-side calls.
 * This provides zero-latency communication between Workers.
 *
 * @param env - The Cloudflare environment from Astro.locals.runtime
 * @param request - The original request (for forwarding cookies/headers)
 *
 * @example
 * ```astro
 * ---
 * import { createServerTRPCClient } from '../lib/trpc/server';
 *
 * const { env } = Astro.locals.runtime;
 * const trpc = createServerTRPCClient(env, Astro.request);
 *
 * const videos = await trpc.mux.listVideosFromDatabase.query({
 *   libraryId: 'your-library-id',
 *   limit: 20,
 * });
 * ---
 * ```
 */
export function createServerTRPCClient(env: Env, request?: Request) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				// URL doesn't matter for service bindings - it's only used for routing
				url: "https://awt-cms-worker/trpc",
				transformer: superjson,
				// Forward original headers to preserve session cookies, add API key for auth
				headers: {
					...(request ? Object.fromEntries(request.headers) : {}),
					"x-api-key": env.AWT_CMS_API_KEY,
				},
				fetch: async (url, options) => {
					// Use Service Binding instead of public HTTP
					const internalRequest = new Request(url, options);
					return env.AWT_CMS.fetch(internalRequest);
				},
			}),
		],
	});
}

/**
 * Create a tRPC client with API key authentication for server-side calls.
 * Use this when you need to make authenticated calls without a user session.
 *
 * @param env - The Cloudflare environment from Astro.locals.runtime
 * @param apiKey - The API key for authentication (use env.AWT_CMS_API_KEY)
 *
 * @example
 * ```typescript
 * // In an API route
 * export const GET: APIRoute = async ({ locals }) => {
 *   const { env } = locals.runtime;
 *   const trpc = createApiKeyTRPCClient(env, env.AWT_CMS_API_KEY);
 *
 *   const libraries = await trpc.mux.listLibraries.query();
 *   return new Response(JSON.stringify(libraries));
 * };
 * ```
 */
export function createApiKeyTRPCClient(env: Env, apiKey: string) {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: "https://awt-cms-worker/trpc",
				transformer: superjson,
				headers: {
					"x-api-key": apiKey,
				},
				fetch: async (url, options) => {
					const internalRequest = new Request(url, options);
					return env.AWT_CMS.fetch(internalRequest);
				},
			}),
		],
	});
}
