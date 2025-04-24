import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";

export const client = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://aiwartrail.cobaltdev.workers.dev"
      : "http://localhost:4321",
  plugins: [
    magicLinkClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});

export const {
  signIn,
  signOut,
  useSession,
  signUp,
  $Infer,
  updateUser,
  changePassword,
  resetPassword,
  forgetPassword,
  sendVerificationEmail,
  changeEmail,
  subscription,
} = client;
