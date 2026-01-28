import { defineMiddleware } from "astro:middleware";
import {
	type AuthState,
	getAuthState,
	type StoredSession,
} from "@/lib/auth-check";

// Default auth state for unauthenticated users
const defaultAuthState: AuthState = {
	isAuthenticated: false,
	hasActiveSubscription: false,
	user: null,
	subscription: null,
	subscriptionStatus: null,
};

export const onRequest = defineMiddleware(async (context, next) => {
	// Get the user's authentication session from KV
	const sessionData = (await context.session?.get(
		"session",
	)) as StoredSession | null;
	const isAuthed = !!sessionData?.userId;

	// Define the URL and path from the request
	const url = new URL(context.request.url);
	const path = url.pathname;

	// Define public and private paths from the URL
	const publicPaths = ["/signup", "/login"];
	const isPublicPath = publicPaths.includes(path);
	const isPrivatePath = path.startsWith("/account");
	const premiumPaths = ["premium", "film-series"];
	const isPremiumPath = premiumPaths.some((pattern) => path.includes(pattern));

	// Inspect the URL and check for token errors or presence of token
	const tokenError = url.searchParams.get("error");
	const token = url.searchParams.get("token");

	// Attach auth state to context.locals for all routes
	// Only query D1 if user has a session (avoids unnecessary DB queries)
	if (isAuthed && sessionData) {
		context.locals.auth = await getAuthState(context, sessionData);
	} else {
		context.locals.auth = defaultAuthState;
	}

	// Redirect users based on authentication status
	if (isPrivatePath && !isAuthed) {
		return context.redirect("/login");
	}
	if (isPublicPath && isAuthed) {
		return context.redirect("/account");
	}
	if (path === "/subscribe/success" && !isAuthed) {
		return context.redirect("/subscribe");
	}
	// Redirect to error pages if Better-Auth throws an error during authentication process
	// Magic link and password reset errors
	if (tokenError === "EXPIRED_TOKEN" || tokenError === "INVALID_TOKEN") {
		return context.redirect(`/login/login-error?response=${tokenError}`);
	}
	// Email verification errors
	if (tokenError === "token_expired" || tokenError === "invalid_token") {
		return context.redirect(`/login/verification-error?response=${tokenError}`);
	}
	// Check reset password route specifically for token presence
	if (path === "/login/reset-password") {
		if (!token) {
			// If no token is present, redirect to error page
			return context.redirect("/login/reset-error");
		}
		// Token exists, proceed with the request
		return next();
	}

	// Check premium content routes
	if (isPremiumPath && !context.locals.auth.hasActiveSubscription) {
		return context.redirect("/subscribe");
	}

	return next();
});
