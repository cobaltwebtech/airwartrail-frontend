/**
 * Server-side authentication and subscription checking utility
 * This mirrors the logic from useSubStatus.ts for consistency
 *
 * Works with Cloudflare Workers + D1 + Better Auth setup
 */

import type { APIContext, AstroGlobal } from "astro";
import { eq } from "drizzle-orm";
import { createDrizzle } from "@/lib/auth";
import * as schema from "@/lib/db-auth-schema";

// Type for the session data stored in Astro.session
export interface StoredSession {
	userId: string;
	token: string;
}

// Type for user data from database
export interface UserData {
	id: string;
	name: string;
	email: string;
	role: string | null;
	image: string | null;
	emailVerified: boolean;
	banned: boolean | null;
}

// Type for subscription data from database
export interface SubscriptionData {
	id: string;
	plan: string;
	status: string | null;
	periodEnd: Date | null;
	cancelAtPeriodEnd: boolean | null;
}

/** Auth state attached to Astro.locals by middleware */
export interface AuthState {
	isAuthenticated: boolean;
	hasActiveSubscription: boolean;
	user: UserData | null;
	subscription: SubscriptionData | null;
	subscriptionStatus: "active" | "trialing" | "admin" | null;
}

export interface AuthCheckResult extends AuthState {}

/**
 * Get the D1 database from context locals
 * Works with both AstroGlobal and APIContext
 */
function getDatabaseFromLocals(locals: App.Locals): D1Database | null {
	try {
		const runtime = locals.runtime as { env: Env } | undefined;
		return runtime?.env?.DB_AUTH ?? null;
	} catch {
		return null;
	}
}

/**
 * Get auth state for middleware - called when session exists
 * This is the core logic shared between middleware and page-level checks
 *
 * @param context - API context (from middleware or endpoint)
 * @param sessionData - Already-fetched session data from KV
 * @returns AuthState with user and subscription data
 */
export async function getAuthState(
	context: APIContext,
	sessionData: StoredSession,
): Promise<AuthState> {
	const noAuthResult: AuthState = {
		isAuthenticated: false,
		hasActiveSubscription: false,
		user: null,
		subscription: null,
		subscriptionStatus: null,
	};

	try {
		// Get D1 database from runtime context
		const d1 = getDatabaseFromLocals(context.locals);
		if (!d1) {
			console.error("Database not available in runtime context");
			return noAuthResult;
		}

		const db = createDrizzle(d1);

		// Fetch user from database
		const [userData] = await db
			.select({
				id: schema.user.id,
				name: schema.user.name,
				email: schema.user.email,
				role: schema.user.role,
				image: schema.user.image,
				emailVerified: schema.user.emailVerified,
				banned: schema.user.banned,
			})
			.from(schema.user)
			.where(eq(schema.user.id, sessionData.userId))
			.limit(1);

		// If user not found, session is invalid
		if (!userData) {
			return noAuthResult;
		}

		// Check if user is banned
		if (userData.banned) {
			return noAuthResult;
		}

		// Check if user is admin - admins get premium access (matching useSubStatus logic)
		if (userData.role === "admin") {
			return {
				isAuthenticated: true,
				hasActiveSubscription: true,
				user: userData,
				subscription: null,
				subscriptionStatus: "admin",
			};
		}

		// Query subscription table for active/trialing subscriptions
		// The referenceId in subscription table links to user.id
		const [subscriptionData] = await db
			.select({
				id: schema.subscription.id,
				plan: schema.subscription.plan,
				status: schema.subscription.status,
				periodEnd: schema.subscription.periodEnd,
				cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
			})
			.from(schema.subscription)
			.where(eq(schema.subscription.referenceId, sessionData.userId))
			.limit(1);

		// Check if subscription is active or trialing (matching useSubStatus logic)
		const hasActiveSubscription =
			subscriptionData?.status === "active" ||
			subscriptionData?.status === "trialing";

		return {
			isAuthenticated: true,
			hasActiveSubscription,
			user: userData,
			subscription: subscriptionData ?? null,
			subscriptionStatus: hasActiveSubscription
				? (subscriptionData.status as "active" | "trialing")
				: null,
		};
	} catch (error) {
		console.error("getAuthState error:", error);
		return noAuthResult;
	}
}

/**
 * Server-side check for authentication and subscription status
 * Mirrors the logic in useSubStatus.ts React hook
 *
 * NOTE: When middleware is enabled, prefer using `Astro.locals.auth` directly
 * as the auth state is already populated. This function is kept for backwards
 * compatibility and for use outside of middleware context.
 *
 * @param Astro - Astro global context
 * @returns AuthCheckResult with authentication and subscription status
 *
 * @example
 * ```astro
 * ---
 * // Preferred: Use middleware-populated auth state
 * const { isAuthenticated, hasActiveSubscription, user } = Astro.locals.auth;
 *
 * // Alternative: Direct function call (useful in API routes without middleware)
 * // import { checkAuthAndSubscription } from "@/lib/auth-check";
 * // const auth = await checkAuthAndSubscription(Astro);
 * ---
 *
 * {hasActiveSubscription ? (
 *   <PremiumContent />
 * ) : (
 *   <SubscribeCTA />
 * )}
 * ```
 */
export async function checkAuthAndSubscription(
	Astro: AstroGlobal,
): Promise<AuthCheckResult> {
	// If middleware has already populated auth state, use it
	const localsAuth = (Astro.locals as { auth?: AuthState }).auth;
	if (localsAuth) {
		return localsAuth;
	}

	// Fallback: Fetch auth state directly (for use outside middleware)
	const noAuthResult: AuthCheckResult = {
		isAuthenticated: false,
		hasActiveSubscription: false,
		user: null,
		subscription: null,
		subscriptionStatus: null,
	};

	try {
		// Get session from Astro session storage
		const sessionData = (await Astro.session?.get(
			"session",
		)) as StoredSession | null;

		// If no session, user is not authenticated
		if (!sessionData?.userId || !sessionData?.token) {
			return noAuthResult;
		}

		// Use shared getAuthState logic
		return await getAuthState(
			{ locals: Astro.locals } as unknown as APIContext,
			sessionData,
		);
	} catch (error) {
		console.error("Server auth check error:", error);
		return noAuthResult;
	}
}

/**
 * Lightweight version that only checks session existence
 * Use this for pages that just need to know if user is logged in
 * Does NOT check subscription status
 */
export async function checkAuthOnly(
	Astro: AstroGlobal,
): Promise<{ isAuthenticated: boolean; userId: string | null }> {
	try {
		const sessionData = (await Astro.session?.get(
			"session",
		)) as StoredSession | null;

		if (!sessionData?.userId || !sessionData?.token) {
			return { isAuthenticated: false, userId: null };
		}

		return { isAuthenticated: true, userId: sessionData.userId };
	} catch {
		return { isAuthenticated: false, userId: null };
	}
}

/**
 * Redirect helper for unauthenticated users
 *
 * @example
 * ```astro
 * ---
 * const { isAuthenticated } = await checkAuthAndSubscription(Astro);
 * if (!isAuthenticated) {
 *   return redirectToLogin(Astro.url.pathname);
 * }
 * ---
 * ```
 */
export function redirectToLogin(returnUrl?: string): Response {
	const url = returnUrl
		? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
		: "/login";

	return new Response(null, {
		status: 302,
		headers: { Location: url },
	});
}

/**
 * Redirect helper for users without active subscription
 *
 * @example
 * ```astro
 * ---
 * const { hasActiveSubscription } = await checkAuthAndSubscription(Astro);
 * if (!hasActiveSubscription) {
 *   return redirectToSubscribe(Astro.url.pathname);
 * }
 * ---
 * ```
 */
export function redirectToSubscribe(returnUrl?: string): Response {
	const url = returnUrl
		? `/subscribe?returnUrl=${encodeURIComponent(returnUrl)}`
		: "/subscribe";

	return new Response(null, {
		status: 302,
		headers: { Location: url },
	});
}
