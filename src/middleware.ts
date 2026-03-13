import { defineMiddleware, sequence } from "astro:middleware";
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

/**
 * 1. Session Middleware
 * Establishes authentication state from KV session store.
 * Must run first so subsequent middleware can access context.locals.auth
 */
const sessionMiddleware = defineMiddleware(async (context, next) => {
	const sessionData = (await context.session?.get(
		"session",
	)) as StoredSession | null;

	if (sessionData?.userId) {
		context.locals.auth = await getAuthState(sessionData);
	} else {
		context.locals.auth = defaultAuthState;
	}

	return next();
});

/**
 * 2. Token Error Middleware
 * Handles Better-Auth token errors during authentication flows.
 * Redirects to appropriate error pages for expired/invalid tokens.
 */
const tokenErrorMiddleware = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);
	const path = url.pathname;
	const tokenError = url.searchParams.get("error");
	const token = url.searchParams.get("token");

	// Magic link and password reset errors
	if (tokenError === "EXPIRED_TOKEN" || tokenError === "INVALID_TOKEN") {
		return context.redirect(`/auth/login-error?response=${tokenError}`);
	}

	// Email verification errors
	if (tokenError === "token_expired" || tokenError === "invalid_token") {
		return context.redirect(`/auth/verification-error?response=${tokenError}`);
	}

	// Reset password route requires token presence
	if (path === "/auth/reset-password" && !token) {
		return context.redirect("/auth/reset-error");
	}

	return next();
});

/**
 * 3. Route Protection Middleware
 * Enforces public/private route access based on authentication status.
 * Redirects unauthenticated users away from protected routes.
 */
const routeProtectionMiddleware = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);
	const path = url.pathname;
	const isAuthed = context.locals.auth.isAuthenticated;
	const publicAuthPaths = ["/auth/signup", "/auth/login"];
	const isPublicAuthPath = publicAuthPaths.includes(path);
	const isPrivatePath = path.startsWith("/account");
	const isSubscribePath = path.startsWith("/subscribe/checkout");

	// Redirect unauthenticated users from private routes
	if (isPrivatePath && !isAuthed) {
		return context.redirect("/auth/login");
	}

	// Redirect authenticated users away from login/signup
	if (isPublicAuthPath && isAuthed) {
		return context.redirect("/account");
	}

	// Protect subscription success page
	if (isSubscribePath && !isAuthed) {
		return context.redirect("/subscribe");
	}

	return next();
});

/**
 * 4. Premium Content Middleware
 * Protects premium content routes and prevents URL manipulation.
 * Ensures users have active subscriptions before accessing paid content.
 */
const premiumContentMiddleware = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);
	const path = url.pathname;
	const hasActiveSubscription = context.locals.auth.hasActiveSubscription;
	const premiumLibraryId = import.meta.env.AWT_PREMIUM_LIBRARY_ID;
	const basicVideoRouteMatch = path.match(/^\/watch\/basic\/([^/]+)\/video/);
	const premiumPaths = ["premium", "playlists", "bonus-content"];
	const isPremiumPath = premiumPaths.some((pattern) => path.includes(pattern));

	// Prevent URL manipulation: accessing premium library via basic routes
	if (basicVideoRouteMatch && premiumLibraryId) {
		const libraryId = basicVideoRouteMatch[1];
		if (libraryId === premiumLibraryId && !hasActiveSubscription) {
			console.log(
				`Middleware: Blocked URL manipulation to premium content Library ID: ${libraryId}`,
			);
			return context.redirect("/subscribe");
		}
	}

	// Protect explicit premium content routes
	if (isPremiumPath && !hasActiveSubscription) {
		console.log(
			"Middleware: Blocked access to premium content without active subscription",
		);
		return context.redirect("/subscribe");
	}

	return next();
});

/**
 * Middleware Sequence
 * Order matters - session must be established before protection checks
 */
export const onRequest = sequence(
	sessionMiddleware,
	tokenErrorMiddleware,
	routeProtectionMiddleware,
	premiumContentMiddleware,
);
