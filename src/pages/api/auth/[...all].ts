import type { APIRoute } from "astro";
import { createAuth } from "@/lib/auth";

export const ALL: APIRoute = async (ctx) => {
	try {
		const runtime = ctx.locals.runtime as { env: Env } | undefined;
		if (!runtime?.env) {
			return new Response(
				JSON.stringify({ error: "Environment variables not available" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const auth = createAuth(runtime.env);
		const response = await auth.handler(ctx.request);

		// If the auth is good then set the session data using Astro Sessions
		if (response?.ok && ctx.session) {
			const authData = (await response.clone().json()) as {
				user?: { id: string };
				session?: { token: string };
			};
			if (authData?.user && authData?.session?.token) {
				ctx.session.set("session", {
					userId: authData.user?.id,
					token: authData.session?.token,
				});
			}
		}

		// Destroy session data on sign out
		if (ctx.url.pathname.endsWith("/sign-out")) {
			ctx.session?.destroy();
			return new Response(JSON.stringify({ success: true }), { status: 200 });
		}

		return response;
	} catch (error) {
		console.error("Auth handler error:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
