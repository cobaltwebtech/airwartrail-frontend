import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";

export const client = createAuthClient({
  baseURL: import.meta.env.BETTER_AUTH_URL,
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
  revokeSessions,
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
