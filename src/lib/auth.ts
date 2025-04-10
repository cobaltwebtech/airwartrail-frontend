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
const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

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
            id: "basic",
            name: "Basic Plan",
            description: "Basic subscription plan",
            price: {
              amount: 999, // $9.99
              currency: "usd",
              interval: "month",
            },
          },
        ],
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
