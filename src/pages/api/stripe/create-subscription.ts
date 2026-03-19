import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { createAuth, createDrizzle, createStripeClient } from "@/lib/auth";
import * as schema from "@/lib/db-auth-schema";

// Price ID for the premium plan - should match auth.ts config
const PREMIUM_PRICE_ID = import.meta.env.STRIPE_PRICE_ID;

export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = createAuth(env as Env);
		const stripeClient = createStripeClient(env.STRIPE_SECRET_KEY);
		const db = createDrizzle(env.DB_AUTH);

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

		// Parse request body
		const body = (await request.json()) as {
			paymentMethodId: string;
			customerId: string;
			promoCodeId?: string;
		};

		const { paymentMethodId, customerId, promoCodeId } = body;

		if (!paymentMethodId || !customerId) {
			return new Response(
				JSON.stringify({ error: "Payment method ID and customer ID required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check if user already has an active subscription
		const existingSubscriptions = await db
			.select()
			.from(schema.subscription)
			.where(eq(schema.subscription.referenceId, user.id));

		const activeSubscription = existingSubscriptions.find(
			(sub) => sub.status === "active" || sub.status === "trialing",
		);

		if (activeSubscription) {
			return new Response(
				JSON.stringify({ error: "You already have an active subscription" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Attach the payment method to the customer
		await stripeClient.paymentMethods.attach(paymentMethodId, {
			customer: customerId,
		});

		// Set as default payment method
		await stripeClient.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		// Update user's stripeCustomerId if not already set
		if (!user.stripeCustomerId) {
			await db
				.update(schema.user)
				.set({ stripeCustomerId: customerId })
				.where(eq(schema.user.id, user.id));
		}

		// Build subscription parameters
		const subscriptionParams: Stripe.SubscriptionCreateParams = {
			customer: customerId,
			items: [{ price: PREMIUM_PRICE_ID }],
			payment_behavior: "error_if_incomplete",
			expand: ["latest_invoice.payment_intent"],
			metadata: {
				userId: user.id,
			},
			// Enable automatic tax if configured
			automatic_tax: {
				enabled: true,
			},
		};

		// Apply promo code discount if provided
		if (promoCodeId) {
			subscriptionParams.discounts = [{ promotion_code: promoCodeId }];
		}

		// Create the subscription
		const subscription =
			await stripeClient.subscriptions.create(subscriptionParams);

		// Check if the subscription requires additional action (e.g., 3D Secure)
		const invoice = subscription.latest_invoice as
			| { payment_intent?: { status: string; client_secret: string } }
			| undefined;
		const paymentIntent = invoice?.payment_intent;

		if (paymentIntent?.status === "requires_action") {
			return new Response(
				JSON.stringify({
					status: "requires_action",
					clientSecret: paymentIntent.client_secret,
					subscriptionId: subscription.id,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Create subscription record in database
		// Note: The webhook will also handle this, but we create it here for immediate feedback
		const subscriptionItem = subscription.items.data[0];
		const periodStart = subscriptionItem?.current_period_start
			? new Date(subscriptionItem.current_period_start * 1000)
			: new Date();
		const periodEnd = subscriptionItem?.current_period_end
			? new Date(subscriptionItem.current_period_end * 1000)
			: new Date();

		await db
			.insert(schema.subscription)
			.values({
				id: subscription.id,
				plan: "premium",
				status: subscription.status,
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscription.id,
				referenceId: user.id,
				periodStart,
				periodEnd,
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
			})
			.onConflictDoUpdate({
				target: schema.subscription.id,
				set: {
					status: subscription.status,
					periodStart,
					periodEnd,
				},
			});

		return new Response(
			JSON.stringify({
				status: "success",
				subscriptionId: subscription.id,
				subscriptionStatus: subscription.status,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error creating subscription:", error);

		// Handle Stripe-specific errors
		if (error && typeof error === "object" && "type" in error) {
			const stripeError = error as { type: string; message: string };
			if (stripeError.type === "StripeCardError") {
				return new Response(
					JSON.stringify({
						error: stripeError.message || "Your card was declined",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

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
