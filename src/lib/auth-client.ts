import { createAuthClient } from "better-auth/react";
import { passkeyClient, magicLinkClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";

export const client = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://www.airwartrail.com"
      : "http://localhost:4321",
  plugins: [
    passkeyClient(),
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
  passkey: passkeyActions,
  useListPasskeys,
  $Infer,
  updateUser,
  changePassword,
  resetPassword,
  forgetPassword,
  changeEmail,
  subscription,
} = client;
