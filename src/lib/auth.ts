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
						from: "Air War Trail <auth@airwartrail.com>",
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
						from: "Air War Trail <auth@airwartrail.com>",
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
							from: "Air War Trail <auth@airwartrail.com>",
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
							from: "Air War Trail <auth@airwartrail.com>",
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
				},
				onEvent: async (event) => {
					try {
						console.log("Processing Stripe webhook event:", event.type);
						const db = createDrizzle(env.DB_AUTH);

						// Handle events from Stripe sent via webhook
						if (event.type === "checkout.session.completed") {
							const session = event.data.object;
							console.log("Checkout session completed:", {
								customerId: session.customer,
								subscriptionId: session.subscription,
								status: session.status,
							});
						} else if (event.type === "customer.subscription.created") {
							const subscription = event.data.object as Stripe.Subscription;
							console.log("Subscription created:", {
								id: subscription.id,
								status: subscription.status,
								customerId: subscription.customer,
								planId: subscription.items.data[0]?.price.id,
								currentPeriodEnd: subscription.items.data[0]?.current_period_end
									? new Date(
											subscription.items.data[0].current_period_end * 1000,
										)
									: null,
							});

							// Update the subscription in the database
							try {
								// First, get the user ID from the Stripe customer
								const customerResponse = await stripeClient.customers.retrieve(
									subscription.customer as string,
								);
								const customer = customerResponse as Stripe.Customer;
								const userId = customer.metadata?.userId;

								if (!userId) {
									console.error("No user ID found in Stripe customer metadata");
									return;
								}

								// Use Drizzle syntax for INSERT with ON CONFLICT
								await db
									.insert(schema.subscription)
									.values({
										id: subscription.id,
										plan: "premium",
										status: subscription.status,
										stripeCustomerId: subscription.customer as string,
										stripeSubscriptionId: subscription.id,
										referenceId: userId,
										// Convert timestamps to Date objects
										periodStart: subscription.items.data[0]
											?.current_period_start
											? new Date(
													subscription.items.data[0].current_period_start *
														1000,
												)
											: null,
										periodEnd: subscription.items.data[0]?.current_period_end
											? new Date(
													subscription.items.data[0].current_period_end * 1000,
												)
											: null,
										// Keep as boolean for schema compatibility
										cancelAtPeriodEnd:
											subscription.cancel_at_period_end || false,
									})
									.onConflictDoUpdate({
										target: schema.subscription.id,
										set: {
											status: subscription.status,
											periodStart: subscription.items.data[0]
												?.current_period_start
												? new Date(
														subscription.items.data[0].current_period_start *
															1000,
													)
												: null,
											periodEnd: subscription.items.data[0]?.current_period_end
												? new Date(
														subscription.items.data[0].current_period_end *
															1000,
													)
												: null,
											cancelAtPeriodEnd:
												subscription.cancel_at_period_end || false,
										},
									});
								console.log("Subscription data updated in database");
							} catch (error) {
								console.error(
									"Error updating subscription in database:",
									error,
								);
							}
						} else if (event.type === "customer.subscription.updated") {
							const subscription = event.data.object as Stripe.Subscription;
							console.log("Subscription updated:", {
								id: subscription.id,
								status: subscription.status,
								customerId: subscription.customer,
								cancelAtPeriodEnd: subscription.cancel_at_period_end,
							});

							try {
								// Use Drizzle syntax for UPDATE
								await db
									.update(schema.subscription)
									.set({
										status: subscription.status,
										periodStart: subscription.items.data[0]
											?.current_period_start
											? new Date(
													subscription.items.data[0].current_period_start *
														1000,
												)
											: null,
										periodEnd: subscription.items.data[0]?.current_period_end
											? new Date(
													subscription.items.data[0].current_period_end * 1000,
												)
											: null,
										cancelAtPeriodEnd:
											subscription.cancel_at_period_end || false,
									})
									.where(
										eq(
											schema.subscription.stripeSubscriptionId,
											subscription.id,
										),
									);
								console.log("Subscription status updated in database");
							} catch (error) {
								console.error(
									"Error updating subscription status in database:",
									error,
								);
							}
						} else if (event.type === "customer.subscription.deleted") {
							const subscription = event.data.object as Stripe.Subscription;
							console.log("Subscription deleted:", {
								id: subscription.id,
								customerId: subscription.customer,
							});

							try {
								// Use Drizzle syntax for UPDATE
								await db
									.update(schema.subscription)
									.set({
										status: "canceled",
										periodStart: subscription.items.data[0]
											?.current_period_start
											? new Date(
													subscription.items.data[0].current_period_start *
														1000,
												)
											: null,
										periodEnd: subscription.items.data[0]?.current_period_end
											? new Date(
													subscription.items.data[0].current_period_end * 1000,
												)
											: null,
									})
									.where(
										eq(
											schema.subscription.stripeSubscriptionId,
											subscription.id,
										),
									);
								console.log("Subscription marked as canceled in database");
							} catch (error) {
								console.error(
									"Error updating subscription status in database:",
									error,
								);
							}
						} else if (event.type === "checkout.session.expired") {
							// Delete stale checkout session from database
							const session = event.data.object as Stripe.Checkout.Session;
							console.log("Checkout session expired:", {
								customerId: session.customer,
								status: session.status,
								sessionId: session.client_reference_id,
							});

							try {
								// Use Drizzle syntax for DELETE
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
								console.log("Stale session deleted from database");
							} catch (error) {
								console.error(
									"Error deleting stale session from database:",
									error,
								);
							}
						}
					} catch (error) {
						console.error(
							"Error processing webhook within onEvent handler:",
							error,
						);
					}

					// Return undefined to indicate to Better Auth that the event was handled
					return undefined;
				},
			}),
		],
	});
};
