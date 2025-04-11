import { betterAuth } from "better-auth";
import { passkey } from "better-auth/plugins/passkey";
import { twoFactor } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { Resend } from "resend";

// Create a new Turso database connection
const client = createClient({
  url: import.meta.env.TURSO_DB_URL,
  authToken: import.meta.env.TURSO_DB_TOKEN,
});

// Create Kysely instance with Turso dialect
const dialect = new LibsqlDialect({ client });

// Initialize Stripe
export const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

// Initialize Resend
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: {
    dialect,
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async (
        { user, newEmail, url, token },
        request,
      ) => {
        try {
          await resend.emails.send({
            from: "Airwartrail <no-reply@contact.cobaltweb.tech>",
            to: user.email, // Send to current email for verification
            subject: "Confirm Email Change",
            html: `
              <h1>Confirm Email Change</h1>
              <p>You have requested to change your email address to ${newEmail}.</p>
              <p>Click the link below to confirm this change:</p>
              <a href="${url}">Confirm Email Change</a>
              <p>If you did not request this change, please ignore this email.</p>
            `,
          });
        } catch (error) {
          console.error("Error sending email change verification:", error);
          throw error;
        }
      },
    },
  },
  plugins: [
    passkey(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        try {
          console.log("Attempting to send magic link email to:", email);
          await resend.emails.send({
            from: "Airwartrail <no-reply@contact.cobaltweb.tech>",
            to: email,
            subject: "Sign in to Airwar Trail",
            html: `
              <h1>Welcome to Airwartrail!</h1>
              <p>Click the link below to sign in to your account:</p>
              <a href="${url}">Sign in to Airwartrail</a>
              <p>This link will expire in 5 minutes.</p>
            `,
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
            priceId: "price_1RC1jsE1nIE0FtFy5VTk62mP", // The price id from Stripe
          },
        ],
      },
      onEvent: async (event) => {
        console.log("Received Stripe webhook event:", event.type);

        // Handle critical subscription events
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          console.log("Checkout session completed:", {
            customerId: session.customer,
            subscriptionId: session.subscription,
            status: session.status,
          });
        } else if (event.type === "customer.subscription.created") {
          const subscription = event.data.object;
          console.log("Subscription created:", {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
            planId: subscription.items.data[0].price.id,
            currentPeriodEnd: new Date(
              subscription.items.data[0].current_period_end * 1000,
            ),
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
          const subscription = event.data.object;
          console.log("Subscription updated:", {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
          });

          // Update the subscription status in the database
          try {
            await client.execute({
              sql: `
                UPDATE subscription
                SET status = ?,
                    periodEnd = ?
                WHERE stripeSubscriptionId = ?
              `,
              args: [
                subscription.status,
                new Date(
                  subscription.items.data[0].current_period_end * 1000,
                ).toISOString(),
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
          const subscription = event.data.object;
          console.log("Subscription deleted:", {
            id: subscription.id,
            customerId: subscription.customer,
          });

          // Update the subscription status to canceled in the database
          try {
            await client.execute({
              sql: `
                UPDATE subscription
                SET status = 'canceled'
                WHERE stripeSubscriptionId = ?
              `,
              args: [subscription.id],
            });
            console.log("Subscription marked as canceled in database");
          } catch (error) {
            console.error(
              "Error updating subscription status in database:",
              error,
            );
          }
        }
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }: { user: { email: string }; otp: string }) {
          console.log(`Sending OTP to ${user.email}: ${otp}`);
          // await resend.emails.send({
          // 	from: "Acme <no-reply@demo.better-auth.com>",
          // 	to: user.email,
          // 	subject: "Your OTP",
          // 	html: `Your OTP is ${otp}`,
          // });
        },
      },
    }),
  ],
  rateLimit: {
    enabled: true,
  },
});
