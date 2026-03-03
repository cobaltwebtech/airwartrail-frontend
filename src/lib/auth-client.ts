import { sentinelClient } from "@better-auth/infra/client";
import { stripeClient } from "@better-auth/stripe/client";
import { adminClient, magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const client = createAuthClient({
	baseURL: import.meta.env.BETTER_AUTH_URL,
	plugins: [
		magicLinkClient(),
		adminClient(),
		sentinelClient(),
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
	requestPasswordReset,
	resetPassword,
	sendVerificationEmail,
	changeEmail,
	subscription,
} = client;
