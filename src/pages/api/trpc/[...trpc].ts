import { ENV } from "varlock/env";
/**
 * tRPC API Proxy Route
 *
 * This route proxies browser requests to the CMS Worker via Service Bindings.
 * All tRPC calls from React components go through this endpoint.
 *
 * Rate limiting is applied based on authentication status:
 * - Basic/unauthenticated users: 100 requests per 60 seconds
 * - Premium subscribers: 200 requests per 60 seconds
 */

import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

/**
 * Procedures the browser may call through this proxy. The proxy attaches the
 * server's API key, so anything not listed here is rejected (including all
 * mutations). Keep this in sync with the procedures used in src/components.
 */
const PUBLIC_PROCEDURES = new Set([
	"mux.generateSignedTokens",
	"mux.generateSignedTokensBatch",
	"mux.getChapters",
	"mux.getPlaylist",
	"mux.getThumbnail",
	"mux.getThumbnailBatch",
	"mux.getVideoById",
	"mux.getVideoTags",
	"mux.listPlaylists",
	"mux.listTags",
	"mux.listVideosFromDatabase",
	"mux.searchVideosByTags",
]);

// Bonus content (photos and documents) is only available to subscribers
const SUBSCRIBER_PROCEDURES = new Set([
	"cfImages.albums.getAlbum",
	"cfImages.albums.listAlbums",
	"cfImages.images.getImagesByCfIds",
	"cfImages.signedUrls.signVariants",
	"documents.list",
]);

// Procedures that mint Mux playback tokens
const TOKEN_PROCEDURES = new Set([
	"mux.generateSignedTokens",
	"mux.generateSignedTokensBatch",
]);

// Longest token lifetime the client requests (3 hours for premium videos)
const MAX_TOKEN_EXPIRES_IN = 60 * 60 * 3;

const errorResponse = (status: number, message: string, code: string) =>
	new Response(JSON.stringify({ error: { message, code } }), {
		status,
		headers: { "Content-Type": "application/json" },
	});

/**
 * Extract the per-procedure inputs from a tRPC request.
 * Inputs are superjson-encoded ({ json, meta }) and keyed by batch index.
 */
function getProcedureInputs(
	rawInput: string | null,
	count: number,
	isBatch: boolean,
): Array<Record<string, unknown> | undefined> {
	if (!rawInput) return Array.from({ length: count }, () => undefined);

	const parsed = JSON.parse(rawInput) as Record<string, unknown>;
	const unwrap = (value: unknown) =>
		value && typeof value === "object" && "json" in value
			? ((value as { json: unknown }).json as Record<string, unknown>)
			: undefined;

	return Array.from({ length: count }, (_, i) =>
		unwrap(isBatch ? parsed[String(i)] : parsed),
	);
}

/**
 * Return an error message if the procedure call is not allowed, otherwise null.
 */
function checkProcedureAccess(
	procedure: string,
	input: Record<string, unknown> | undefined,
	hasActiveSubscription: boolean,
): string | null {
	const isPublic = PUBLIC_PROCEDURES.has(procedure);
	const isSubscriberOnly = SUBSCRIBER_PROCEDURES.has(procedure);

	if (!isPublic && !isSubscriberOnly) {
		return `Procedure not available: ${procedure}`;
	}

	if (isSubscriberOnly && !hasActiveSubscription) {
		return "An active subscription is required";
	}

	const libraryId = input?.libraryId;
	const expiresIn = input?.expiresIn;

	if (
		typeof expiresIn === "number" &&
		(expiresIn <= 0 || expiresIn > MAX_TOKEN_EXPIRES_IN)
	) {
		return "Requested token lifetime is not allowed";
	}

	if (!hasActiveSubscription) {
		// Premium library content requires a subscription
		if (libraryId === ENV.AWT_PREMIUM_LIBRARY_ID) {
			return "An active subscription is required";
		}

		// Non-subscribers can only mint playback tokens for the basic library
		if (
			TOKEN_PROCEDURES.has(procedure) &&
			libraryId !== ENV.AWT_BASIC_LIBRARY_ID
		) {
			return "An active subscription is required";
		}
	}

	return null;
}

/**
 * Handle all HTTP methods (GET, POST, etc.)
 * tRPC uses GET for queries and POST for mutations
 */
export const ALL: APIRoute = async ({ params, request, locals }) => {
	// Determine rate limit tier based on auth status
	const isAuthenticated = locals.auth?.isAuthenticated ?? false;
	const isPremium = locals.auth?.hasActiveSubscription ?? false;

	// Use user ID for authenticated users, IP for anonymous
	// This prevents shared IP issues for authenticated users
	const rateLimitKey = isAuthenticated
		? `user:${locals.auth?.user?.id ?? "unknown"}`
		: `ip:${request.headers.get("cf-connecting-ip") ?? "unknown"}`;

	// Select rate limiter based on subscription status
	const rateLimiter = isPremium ? env.RATE_LIMIT_PREMIUM : env.RATE_LIMIT_BASIC;
	const rateLimit = isPremium ? 200 : 100;

	try {
		// Apply rate limit before processing request
		const { success } = await rateLimiter.limit({ key: rateLimitKey });

		if (!success) {
			return new Response(
				JSON.stringify({
					error: {
						message: "Error 429 - Rate limit exceeded. Please try again later.",
						code: "TOO_MANY_REQUESTS",
					},
				}),
				{
					status: 429,
					headers: {
						"Content-Type": "application/json",
						"Retry-After": "60",
						"X-RateLimit-Limit": String(rateLimit),
					},
				},
			);
		}

		if (request.method !== "GET" && request.method !== "POST") {
			return errorResponse(405, "Method not allowed", "METHOD_NOT_SUPPORTED");
		}

		// Build the internal URL for the tRPC endpoint
		const path = params.trpc || "";
		const url = new URL(request.url);
		const internalUrl = `https://awt-cms-worker/trpc/${path}${url.search}`;

		// Batched calls arrive as a comma-separated list of procedure paths
		const procedures = path.split(",");
		const isBatch = url.searchParams.get("batch") === "1";

		// Buffer the POST body so the inputs can be checked before forwarding
		const body = request.method === "POST" ? await request.text() : undefined;

		let inputs: Array<Record<string, unknown> | undefined>;
		try {
			inputs = getProcedureInputs(
				body ?? url.searchParams.get("input"),
				procedures.length,
				isBatch,
			);
		} catch {
			return errorResponse(400, "Invalid request input", "BAD_REQUEST");
		}

		for (const [i, procedure] of procedures.entries()) {
			const denied = checkProcedureAccess(procedure, inputs[i], isPremium);
			if (denied) {
				return errorResponse(403, denied, "FORBIDDEN");
			}
		}

		// Create headers with API key authentication
		const headers = new Headers(request.headers);
		headers.set("x-api-key", ENV.AWT_CMS_API_KEY);

		// Forward the request to the CMS Worker via Service Binding
		// Note: We pass URL string and options separately for Miniflare compatibility
		const response = await env.AWT_CMS.fetch(internalUrl, {
			method: request.method,
			headers,
			body,
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
