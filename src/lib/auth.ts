import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { dash } from "@better-auth/infra";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
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
export const createDrizzle = (db: D1Database) => drizzle(db, { schema });

// Factory function to create a Stripe client with the configured API version
export const createStripeClient = (stripeSecretKey: string) =>
	new Stripe(stripeSecretKey, {
		apiVersion: "2026-02-25.clover",
	});

// Factory function to create the auth instance with environment variables
export const createAuth = (env: Env) => {
	const resend = new Resend(env.RESEND_API_KEY);
	const stripeClient = createStripeClient(env.STRIPE_SECRET_KEY);

	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		appName: "Air War Trail",
		experimental: { joins: true },
		database: drizzleAdapter(createDrizzle(env.DB_AUTH), {
			provider: "sqlite",
			schema,
		}),
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		},
		rateLimit: {
			enabled: true,
		},
		advanced: {
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip"], // Cloudflare specific header for rate limiting
			},
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			sendResetPassword: async ({ user, url }) => {
				try {
					await resend.emails.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Password Reset",
						react: await PasswordReset({ url }),
					});
				} catch (error) {
					console.error("Error sending password reset:", error);
					throw error;
				}
			},
		},
		emailVerification: {
			expiresIn: 1800,
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				try {
					await resend.emails.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Verify Your Email Address",
						react: await VerifyEmail({ url }),
					});
				} catch (error) {
					console.error("Error sending email verification:", error);
					throw error;
				}
			},
		},
		user: {
			changeEmail: {
				enabled: true,
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					try {
						await resend.emails.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: user.email,
							subject: "Confirm Email Change",
							react: await ConfirmChange({ newEmail, url }),
						});
					} catch (error) {
						console.error("Error sending email change confirmation:", error);
						throw error;
					}
				},
			},
		},
		plugins: [
			admin(),
			dash({
				apiKey: env.BETTER_AUTH_API_KEY,
				activityTracking: {
					enabled: true,
					// How often lastActiveAt is written to the DB per user.
					// 5 minutes (300000ms) is the default and a sensible value
					updateInterval: 300000,
				},
			}),
			magicLink({
				storeToken: "hashed",
				disableSignUp: true,
				sendMagicLink: async ({ email, url }) => {
					try {
						await resend.emails.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: email,
							subject: "Login to Air War Trail",
							react: await MagicLink({ url }),
						});
					} catch (error) {
						console.error("Error sending magic link email:", error);
						throw error;
					}
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
							priceId: env.STRIPE_PRICE_ID, // The price id from Stripe
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

					switch (event.type) {
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
							break;
						}
						case "invoice.payment_failed": {
							const invoice = event.data.object as Stripe.Invoice;
							const subscriptionId =
								invoice.parent?.subscription_details?.subscription;
							console.error(
								`Invoice payment failed: ${invoice.id} for subscription ${subscriptionId}`,
							);
							break;
						}
						case "invoice.payment_action_required": {
							const invoice = event.data.object as Stripe.Invoice;
							console.log(`Invoice requires action (3D Secure): ${invoice.id}`);
							break;
						}
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
						// Checkout session cleanup
						// We are using custom but we keep this in case we do use Stripe's hosted checkout in the future
						case "checkout.session.expired": {
							const session = event.data.object as Stripe.Checkout.Session;
							console.log("Checkout session expired:", session.id);
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
