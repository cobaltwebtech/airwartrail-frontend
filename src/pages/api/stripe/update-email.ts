import type { APIRoute } from "astro";
import { createStripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { customerId, email } = (await request.json()) as {
			customerId?: string;
			email?: string;
		};

		if (!customerId || !email) {
			return new Response("Customer ID and email are required", {
				status: 400,
			});
		}

		// Get the environment from the Astro context
		const runtime = locals.runtime as { env: Env } | undefined;
		if (!runtime?.env) {
			throw new Error("Environment variables not available");
		}

		const stripeClient = createStripeClient(runtime.env.STRIPE_SECRET_KEY);

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
		return new Response("Internal Server Error", { status: 500 });
	}
};
