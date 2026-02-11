/**
 * Image Download API Endpoint
 *
 * Proxies image download requests to the CMS worker via the AWT_CMS
 * Service Binding (direct worker-to-worker, no internet round-trip).
 *
 * Endpoint: GET /api/cf-images/download/:imageId
 *
 * The CMS backend streams the original Cloudflare Images blob back so
 * the user receives the file in its original format (JPEG, PNG, etc.).
 */

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, request, locals }) => {
	const { imageId } = params;

	if (!imageId) {
		return new Response(JSON.stringify({ error: "Missing imageId" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Access the Cloudflare runtime environment
	const runtime = locals.runtime as
		| { env: Env; ctx?: { waitUntil: (promise: Promise<unknown>) => void } }
		| undefined;

	if (!runtime?.env) {
		return new Response(
			JSON.stringify({ error: "Runtime environment not available" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	const { env } = runtime;

	try {
		// Build the internal request to the CMS worker via Service Binding.
		// The hostname is arbitrary — the Service Binding intercepts it.
		const cmsUrl = `https://awt-cms-worker/api/cf-images/download/${imageId}`;

		const headers = new Headers();
		headers.set("x-api-key", env.AWT_CMS_API_KEY);

		// Forward cookies so the CMS can validate session auth if needed
		const cookie = request.headers.get("Cookie");
		if (cookie) {
			headers.set("Cookie", cookie);
		}

		const cmsResponse = await env.AWT_CMS.fetch(cmsUrl, {
			method: "GET",
			headers,
		});

		if (!cmsResponse.ok) {
			// Forward the error status from the CMS
			const errorBody = await cmsResponse.text();
			return new Response(errorBody, {
				status: cmsResponse.status,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Stream the response back to the client, preserving download headers
		const responseHeaders = new Headers();

		const contentType = cmsResponse.headers.get("Content-Type");
		if (contentType) {
			responseHeaders.set("Content-Type", contentType);
		}

		const contentDisposition = cmsResponse.headers.get("Content-Disposition");
		if (contentDisposition) {
			responseHeaders.set("Content-Disposition", contentDisposition);
		}

		const contentLength = cmsResponse.headers.get("Content-Length");
		if (contentLength) {
			responseHeaders.set("Content-Length", contentLength);
		}

		responseHeaders.set("Cache-Control", "private, max-age=300");

		return new Response(cmsResponse.body, {
			status: 200,
			headers: responseHeaders,
		});
	} catch (err) {
		console.error("Image download proxy error:", err);
		return new Response(
			JSON.stringify({ error: "Failed to fetch image for download" }),
			{ status: 502, headers: { "Content-Type": "application/json" } },
		);
	}
};
