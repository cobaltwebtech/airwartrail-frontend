import { createAuthClient } from "better-auth/react";
import {
  passkeyClient,
  twoFactorClient,
  magicLinkClient,
} from "better-auth/client/plugins";
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
    twoFactorClient(),
  ],
});

export const {
  signIn,
  signOut,
  useSession,
  signUp,
  passkey: passkeyActions,
  useListPasskeys,
  twoFactor: twoFactorActions,
  $Infer,
  updateUser,
  changePassword,
  revokeSession,
  revokeSessions,
  changeEmail,
  subscription,
} = client;
