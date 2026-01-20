import type { APIRoute } from "astro";
import { createAuth, createStripeClient } from "@/lib/auth";

// Price ID for the premium plan - should match auth.ts config
const PREMIUM_PRICE_ID = "price_1RJRAiE1nIE0FtFy8qxYKWyk";

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
		const stripeClient = createStripeClient(runtime.env);

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

		// Parse request body
		const body = (await request.json()) as {
			customerId: string;
			address?: {
				line1?: string;
				line2?: string;
				city?: string;
				state?: string;
				postal_code?: string;
				country?: string;
			};
		};

		const { customerId, address } = body;

		if (!customerId) {
			return new Response(
				JSON.stringify({ error: "Customer ID is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Update customer with address for tax calculation
		if (address) {
			await stripeClient.customers.update(customerId, {
				address: {
					line1: address.line1 || "",
					line2: address.line2 || undefined,
					city: address.city || "",
					state: address.state || "",
					postal_code: address.postal_code || "",
					country: address.country || "US",
				},
			});
		}

		// Create an invoice preview to calculate tax
		const invoicePreview = await stripeClient.invoices.createPreview({
			customer: customerId,
			subscription_details: {
				items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
			},
			automatic_tax: {
				enabled: true,
			},
		});

		// Extract tax information
		// Total tax is calculated as total - subtotal
		const subtotal = invoicePreview.subtotal;
		const total = invoicePreview.total;
		const tax = total - subtotal;

		return new Response(
			JSON.stringify({
				subtotal,
				tax,
				total,
				currency: invoicePreview.currency,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error calculating tax:", error);
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : "Failed to calculate tax",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
