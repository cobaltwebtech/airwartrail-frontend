import type { APIRoute } from "astro";
import crypto from "crypto";

const bunnyTokenKey = import.meta.env.BUNNY_STREAM_TOKEN;

export const GET: APIRoute = async ({ url }) => {
	const videoId = url.searchParams.get("videoId");
	if (!videoId) {
		return new Response(JSON.stringify({ error: "Missing videoId" }), {
			status: 400,
		});
	}

	// Set expiration 3 hours
	const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 3;

	// Generate token
	const toHash = `${bunnyTokenKey}${videoId}${expires}`;
	const token = crypto.createHash("sha256").update(toHash).digest("hex");

	// Concetenate the token and expiration for use in the URL on client side
	const signedQuery = `?token=${token}&expires=${expires}`;

	return new Response(JSON.stringify({ tokenQuery: signedQuery }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
