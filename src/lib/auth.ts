import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Resend } from "resend";
import Stripe from "stripe";
import { ConfirmChange } from "@/components/email/ConfirmChange";
import { MagicLink } from "@/components/email/MagicLink";
import { PasswordReset } from "@/components/email/PasswordReset";
import { VerifyEmail } from "@/components/email/VerifyEmail";
import * as schema from "@/lib/db-auth-schema";

// Initialize Drizzle with the Cloudflare D1 database
export const createDrizzle = (db: D1Database) =>
	drizzle(db, { schema: schema });

// Initialize Stripe client that accepts runtime environment
export const createStripeClient = (env: Env) => {
	return new Stripe(env.STRIPE_SECRET_KEY, {
		apiVersion: "2025-12-15.clover",
	});
};

// Create auth instance factory that accepts runtime environment
// waitUntil is optional for Cloudflare Workers to ensure emails complete
export const createAuth = (
	env: Env,
	waitUntil?: (promise: Promise<unknown>) => void,
) => {
	// Initialize Stripe with runtime env
	const stripeClient = createStripeClient(env);

	// Initialize Resend for email service with runtime env
	const resend = new Resend(env.RESEND_API_KEY);

	// Helper to schedule background tasks
	// Uses waitUntil on Cloudflare Workers, otherwise fire-and-forget
	const scheduleEmail = (emailPromise: Promise<unknown>) => {
		if (waitUntil) {
			waitUntil(emailPromise);
		}
	};

	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		database: drizzleAdapter(createDrizzle(env.DB_AUTH), {
			provider: "sqlite",
		}),
		session: {
			expiresIn: 60 * 60 * 24 * 7, // Session expires in 7 days
			updateAge: 60 * 60 * 24, // Every 24 hours the session expiration is updated
		},
		rateLimit: {
			enabled: true,
		},
		advanced: {
			ipAddress: {
				// Cloudflare specific header for rate limiting
				ipAddressHeaders: ["cf-connecting-ip"],
			},
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				// Fire and forget - use waitUntil on Cloudflare Workers to prevent timing attacks
				const emailPromise = resend.emails
					.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Password Reset",
						react: await PasswordReset({ url }),
					})
					.then(({ data }) => {
						console.log(
							"Password reset email sent, Resend email ID:",
							data?.id,
						);
					})
					.catch((error) => {
						console.error("Error sending password reset:", error);
					});
				scheduleEmail(emailPromise);
			},
		},
		emailVerification: {
			expiresIn: 1800, // Token expiration set to 30 minutes
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				// Fire and forget - use waitUntil on Cloudflare Workers to prevent timing attacks
				const emailPromise = resend.emails
					.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Verify Your Email Address",
						react: await VerifyEmail({ url }),
					})
					.then(({ data }) => {
						console.log("Verification email sent, Resend email ID:", data?.id);
					})
					.catch((error) => {
						console.error("Error sending email verification:", error);
					});
				scheduleEmail(emailPromise);
			},
		},
		user: {
			changeEmail: {
				enabled: true,
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					// Fire and forget - use waitUntil on Cloudflare Workers to prevent timing attacks
					const emailPromise = resend.emails
						.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: user.email,
							subject: "Confirm Email Change",
							react: await ConfirmChange({ newEmail, url }),
						})
						.then(({ data }) => {
							console.log(
								"Email change confirmation sent, Resend email ID:",
								data?.id,
							);
						})
						.catch((error) => {
							console.error("Error sending email change confirmation:", error);
						});
					scheduleEmail(emailPromise);
				},
			},
		},
		plugins: [
			admin(),
			magicLink({
				// Token expiration default is 5 minutes
				disableSignUp: true,
				sendMagicLink: async ({ email, url }) => {
					// Fire and forget - use waitUntil on Cloudflare Workers to prevent timing attacks
					const emailPromise = resend.emails
						.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: email,
							subject: "Login to Air War Trail",
							react: await MagicLink({ url }),
						})
						.then(({ data }) => {
							console.log(
								"Magic link email sent successfully, Resend email ID:",
								data?.id,
							);
						})
						.catch((error) => {
							console.error("Error sending magic link email:", error);
						});
					scheduleEmail(emailPromise);
				},
			}),
			stripe({
				stripeClient,
				stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
				createCustomerOnSignUp: true,
				subscription: {
					enabled: true,
					plans: [
						{
							name: "premium", // This must match the plan name in the React components
							priceId: "price_1RJRAiE1nIE0FtFy8qxYKWyk", // The price id from Stripe
						},
					],
					getCheckoutSessionParams: async () => {
						return {
							params: {
								billing_address_collection: "required",
								automatic_tax: {
									enabled: true,
								},
							},
						};
					},
					// Lifecycle hooks - plugin handles DB updates automatically
					onSubscriptionComplete: async ({ subscription, plan }) => {
						console.log(
							`Subscription ${subscription.id} completed for plan ${plan.name}`,
						);
					},
					onSubscriptionUpdate: async ({ subscription }) => {
						console.log(
							`Subscription ${subscription.id} updated to status: ${subscription.status}`,
						);
					},
					onSubscriptionCancel: async ({
						subscription,
						cancellationDetails,
					}) => {
						console.log(
							`Subscription ${subscription.id} canceled:`,
							cancellationDetails,
						);
					},
				},
				// Use onEvent only for events NOT handled by the plugin
				// Note: Subscription status updates are handled automatically by Better Auth
				// via customer.subscription.* webhooks (onSubscriptionComplete, onSubscriptionUpdate, onSubscriptionCancel)
				onEvent: async (event) => {
					console.log("Stripe webhook event:", event.type);

					// Handle additional events not covered by the plugin
					switch (event.type) {
						// Invoice lifecycle events (for custom checkout with Stripe Elements)
						case "invoice.created": {
							const invoice = event.data.object as Stripe.Invoice;
							const subscriptionId =
								invoice.parent?.subscription_details?.subscription;
							console.log(
								`Invoice created: ${invoice.id} for subscription ${subscriptionId}`,
							);
							break;
						}
						case "invoice.finalized": {
							const invoice = event.data.object as Stripe.Invoice;
							console.log(
								`Invoice finalized: ${invoice.id}, amount: ${invoice.amount_due}`,
							);
							break;
						}
						case "invoice.paid": {
							const invoice = event.data.object as Stripe.Invoice;
							const subscriptionId =
								invoice.parent?.subscription_details?.subscription;
							console.log(
								`Invoice paid: ${invoice.id} for subscription ${subscriptionId}`,
							);
							// Note: Subscription status is updated by Better Auth via customer.subscription.updated
							break;
						}
						case "invoice.payment_failed": {
							const invoice = event.data.object as Stripe.Invoice;
							const subscriptionId =
								invoice.parent?.subscription_details?.subscription;
							console.error(
								`Invoice payment failed: ${invoice.id} for subscription ${subscriptionId}`,
							);
							// Note: Subscription status (past_due) is updated by Better Auth via customer.subscription.updated
							break;
						}
						case "invoice.payment_action_required": {
							const invoice = event.data.object as Stripe.Invoice;
							console.log(`Invoice requires action (3D Secure): ${invoice.id}`);
							break;
						}

						// Payment intent events (for tracking payment flow)
						case "payment_intent.succeeded": {
							const paymentIntent = event.data.object as Stripe.PaymentIntent;
							console.log(`Payment intent succeeded: ${paymentIntent.id}`);
							break;
						}
						case "payment_intent.payment_failed": {
							const paymentIntent = event.data.object as Stripe.PaymentIntent;
							console.error(
								`Payment intent failed: ${paymentIntent.id}`,
								paymentIntent.last_payment_error?.message,
							);
							break;
						}

						// Checkout session cleanup (safety net, less relevant with custom checkout)
						case "checkout.session.expired": {
							const session = event.data.object as Stripe.Checkout.Session;
							console.log("Checkout session expired:", session.id);
							// Clean up stale incomplete subscriptions if any
							if (session.client_reference_id) {
								const db = createDrizzle(env.DB_AUTH);
								try {
									await db
										.delete(schema.subscription)
										.where(
											and(
												eq(
													schema.subscription.referenceId,
													session.client_reference_id,
												),
												eq(schema.subscription.status, "incomplete"),
											),
										);
								} catch (error) {
									console.error("Error cleaning up expired session:", error);
								}
							}
							break;
						}
					}
				},
			}),
		],
	});
};
