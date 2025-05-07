import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { Resend } from "resend";
import { MagicLink } from "@/components/email/MagicLink";
import { ConfirmChange } from "@/components/email/ConfirmChange";
import { PasswordReset } from "@/components/email/PasswordReset";
import { VerifyEmail } from "@/components/email/VerifyEmail";

// Create a new Turso database connection
const client = createClient({
  url: import.meta.env.TURSO_DB_URL,
  authToken: import.meta.env.TURSO_DB_TOKEN,
});

// Create Kysely instance with Turso dialect
const dialect = new LibsqlDialect({ client });

// Initialize Stripe
export const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

// Initialize Resend
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const auth = betterAuth({
  secret: import.meta.env.BETTER_AUTH_SECRET,
  database: {
    dialect,
    type: "sqlite",
  },
  session: {
    expiresIn: 60 * 60 * 24, // Session expires in 1 day
    updateAge: 60 * 60, // Every 1 hour the session expiration is updated
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
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
      stripeWebhookSecret: import.meta.env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "premium", // This must match the plan name in the client side component
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
                ? new Date(subscription.items.data[0].current_period_end * 1000)
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

              await client.execute({
                sql: `
                  INSERT INTO subscription (
                    id,
                    plan,
                    status,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    periodEnd,
                    referenceId
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT (id) DO UPDATE SET
                    status = excluded.status,
                    periodEnd = excluded.periodEnd
                `,
                args: [
                  subscription.id,
                  "premium", // This should match the plan name in your configuration
                  subscription.status,
                  subscription.customer as string,
                  subscription.id,
                  new Date(
                    subscription.items.data[0].current_period_end * 1000,
                  ).toISOString(),
                  userId,
                ],
              });
              console.log("Subscription data updated in database");
            } catch (error) {
              console.error("Error updating subscription in database:", error);
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
              await client.execute({
                sql: `
                  UPDATE subscription
                  SET status = ?,
                      periodEnd = ?,
                      cancelAtPeriodEnd = ?
                  WHERE stripeSubscriptionId = ?
                `,
                args: [
                  subscription.status,
                  subscription.items.data[0].current_period_end
                    ? new Date(
                        subscription.items.data[0].current_period_end * 1000,
                      ).toISOString()
                    : null,
                  subscription.cancel_at_period_end,
                  subscription.id,
                ],
              });
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

            // Update the subscription status to canceled in the database
            try {
              await client.execute({
                sql: `
                  UPDATE subscription
                  SET status = 'canceled',
                  periodEnd = ?
                  WHERE stripeSubscriptionId = ?
                `,
                args: [
                  subscription.items.data[0]?.current_period_end
                    ? new Date(
                        subscription.items.data[0].current_period_end * 1000,
                      ).toISOString()
                    : null,
                  subscription.id,
                ],
              });
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
              await client.execute({
                sql: `
                  DELETE FROM subscription
                  WHERE referenceId = ? AND status = 'incomplete'
                `,
                args: [session.client_reference_id],
              });
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

        // Return undefined to indicate to Better Auth that you've handled the event
        return undefined;
      },
    }),
  ],
  rateLimit: {
    enabled: true,
  },
});
