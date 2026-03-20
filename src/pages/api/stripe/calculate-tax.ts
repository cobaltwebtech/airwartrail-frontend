import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { createAuth, createStripeClient } from "@/lib/auth";

// Price ID for the premium plan - should match auth.ts config
const PREMIUM_PRICE_ID = env.STRIPE_PRICE_ID;

export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = createAuth(env as Env);
		const stripeClient = createStripeClient(env.STRIPE_SECRET_KEY);

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
			promoCodeId?: string;
		};

		const { customerId, address, promoCodeId } = body;

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
		const previewParams: Stripe.InvoiceCreatePreviewParams = {
			customer: customerId,
			subscription_details: {
				items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
			},
			automatic_tax: {
				enabled: true,
			},
		};

		// Include promo discount in the preview if provided
		if (promoCodeId) {
			previewParams.discounts = [{ promotion_code: promoCodeId }];
		}

		const invoicePreview =
			await stripeClient.invoices.createPreview(previewParams);

		// Extract tax and discount from the invoice preview
		const subtotal = invoicePreview.subtotal;
		const discount =
			invoicePreview.total_discount_amounts?.reduce(
				(sum, d) => sum + d.amount,
				0,
			) ?? 0;
		const tax =
			invoicePreview.total_taxes?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
		const total = invoicePreview.total;

		return new Response(
			JSON.stringify({
				subtotal,
				tax,
				discount,
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
