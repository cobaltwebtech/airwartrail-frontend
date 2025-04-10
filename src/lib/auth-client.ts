import { createAuthClient } from "better-auth/react";
import { passkeyClient, twoFactorClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";
import { magicLinkClient } from "better-auth/client/plugins";

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
} = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://your-production-url.com"
      : "http://localhost:4321",
  plugins: [
    passkeyClient(),
    magicLinkClient(),
    stripeClient({
      subscription: true,
    }),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.href = "/two-factor";
      },
    }),
  ],
});
