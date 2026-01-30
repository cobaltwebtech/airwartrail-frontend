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
export const createAuth = (env: Env) => {
	// Initialize Stripe with runtime env
	const stripeClient = createStripeClient(env);

	// Initialize Resend for email service with runtime env
	const resend = new Resend(env.RESEND_API_KEY);

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
			autoSignIn: true,
			sendResetPassword: async ({ user, url }) => {
				try {
					await resend.emails.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Password Reset",
						react: await PasswordReset({
							url: url,
						}),
					});
				} catch (error) {
					console.error("Error sending password reset:", error);
					throw error;
				}
			},
		},
		emailVerification: {
			expiresIn: 300, // Token expiration set to 5 minutes
			sendVerificationEmail: async ({ user, url }) => {
				try {
					await resend.emails.send({
						from: "Air War Trail <auth@notify.airwartrail.com>",
						to: user.email,
						subject: "Verify Your Email Address",
						react: await VerifyEmail({
							url: url,
						}),
					});
					console.log("Verification email sent to:", user.email);
				} catch (error) {
					console.error("Error sending email verification:", error);
					throw error;
				}
			},
		},
		user: {
			changeEmail: {
				enabled: true,
				sendChangeEmailVerification: async ({ user, newEmail, url }) => {
					try {
						await resend.emails.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: user.email,
							subject: "Confirm Email Change",
							react: await ConfirmChange({
								newEmail: newEmail,
								url: url,
							}),
						});
						console.log("Email change verification sent to:", user.email);
					} catch (error) {
						console.error("Error sending email change verification:", error);
						throw error;
					}
				},
			},
		},
		plugins: [
			admin(),
			magicLink({
				disableSignUp: true,
				sendMagicLink: async ({ email, url }) => {
					try {
						console.log("Attempting to send magic link email to:", email);
						await resend.emails.send({
							from: "Air War Trail <auth@notify.airwartrail.com>",
							to: email,
							subject: "Login to Air War Trail",
							react: await MagicLink({
								url: url,
							}),
						});
						console.log("Magic link email sent successfully");
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
				onEvent: async (event) => {
					console.log("Stripe webhook event:", event.type);

					// Handle additional events not covered by the plugin
					switch (event.type) {
						case "invoice.paid":
							console.log("Invoice paid:", event.data.object.id);
							break;
						case "invoice.payment_failed":
							console.log("Invoice payment failed:", event.data.object.id);
							break;
						case "checkout.session.expired": {
							// Clean up stale incomplete subscriptions
							const session = event.data.object as Stripe.Checkout.Session;
							console.log("Checkout session expired:", session.id);
							const db = createDrizzle(env.DB_AUTH);
							try {
								await db
									.delete(schema.subscription)
									.where(
										and(
											eq(
												schema.subscription.referenceId,
												session.client_reference_id || "",
											),
											eq(schema.subscription.status, "incomplete"),
										),
									);
							} catch (error) {
								console.error("Error cleaning up expired session:", error);
							}
							break;
						}
					}
				},
			}),
		],
	});
};
