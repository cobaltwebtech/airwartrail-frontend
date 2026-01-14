/**
 * tRPC API Proxy Route
 *
 * This route proxies browser requests to the CMS Worker via Service Bindings.
 * All tRPC calls from React components go through this endpoint.
 */

import type { APIRoute } from "astro";

/**
 * Handle all HTTP methods (GET, POST, etc.)
 * tRPC uses GET for queries and POST for mutations
 */
export const ALL: APIRoute = async ({ params, request, locals }) => {
	const { env } = locals.runtime;

	// Build the internal URL for the tRPC endpoint
	const path = params.trpc || "";
	const url = new URL(request.url);
	const internalUrl = `https://awt-cms-worker/trpc/${path}${url.search}`;

	// Create headers with API key authentication
	const headers = new Headers(request.headers);
	headers.set("x-api-key", env.AWT_CMS_API_KEY);

	try {
		// Forward the request to the CMS Worker via Service Binding
		// Note: We pass URL string and options separately for Miniflare compatibility
		const response = await env.AWT_CMS.fetch(internalUrl, {
			method: request.method,
			headers,
			// Only include body for non-GET requests
			body: request.method !== "GET" ? request.body : undefined,
		});

		// Return the response from the CMS Worker
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} catch (error) {
		console.error("tRPC proxy error:", error);

		return new Response(
			JSON.stringify({
				error: {
					message: "Failed to connect to API",
					code: "INTERNAL_SERVER_ERROR",
				},
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
