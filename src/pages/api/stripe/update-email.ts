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

		const { email } = (await request.json()) as { email?: string };

		if (!email) {
			return new Response(JSON.stringify({ error: "Email is required" }), {
				status: 400,
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

		// Update the customer's email in Stripe
		await stripeClient.customers.update(customerId, {
			email: email,
		});

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error updating email in Stripe:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
