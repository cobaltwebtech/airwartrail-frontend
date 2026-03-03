import type { APIRoute } from "astro";
import { createAuth, createStripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Get the environment from the Astro context
		const runtime = locals.runtime as { env: Env } | undefined;
		if (!runtime?.env) {
			return new Response(
				JSON.stringify({ error: "Environment variables not available" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const auth = createAuth(runtime.env);
		const stripeClient = createStripeClient(runtime.env.STRIPE_SECRET_KEY);

		// Get the session from Better Auth
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const user = session.user;

		// Check if user already has a Stripe customer ID
		let customerId = user.stripeCustomerId as string | undefined;

		if (!customerId) {
			// Create a new Stripe customer
			const customer = await stripeClient.customers.create({
				email: user.email,
				name: user.name,
				metadata: {
					userId: user.id,
				},
			});
			customerId = customer.id;

			// Note: The customer ID will be saved by Better Auth's Stripe plugin
			// when the subscription is created
		}

		// Create a SetupIntent for collecting payment method
		const setupIntent = await stripeClient.setupIntents.create({
			customer: customerId,
			payment_method_types: ["card"],
			metadata: {
				userId: user.id,
			},
		});

		return new Response(
			JSON.stringify({
				clientSecret: setupIntent.client_secret,
				customerId: customerId,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error creating setup intent:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Internal Server Error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
