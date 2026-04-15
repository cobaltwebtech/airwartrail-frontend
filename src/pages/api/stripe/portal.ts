import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createAuth, createStripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = createAuth(env as Env);
		const stripeClient = createStripeClient(env.STRIPE_SECRET_KEY);

		// Require authentication
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Use the authenticated user's Stripe customer ID directly
		const customerId = session.user.stripeCustomerId as string | undefined;

		if (!customerId) {
			return new Response(
				JSON.stringify({ error: "No Stripe customer found for this account" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Get the current hostname from the request
		const hostname = new URL(request.url).origin;

		// Create a portal session
		const portalSession = await stripeClient.billingPortal.sessions.create({
			customer: customerId,
			return_url: `${hostname}/account`,
		});

		return new Response(JSON.stringify({ url: portalSession.url }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error creating portal session:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
