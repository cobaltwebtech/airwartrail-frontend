import { auth } from "@/lib/auth";
import type { APIRoute } from "astro";

export const ALL: APIRoute = async (ctx) => {
  try {
    const response = await auth.handler(ctx.request);

    // // Paths the API uses for entry to auth session
    // const authPaths = ["/sign-in/email", "/sign-in/magic-link", "/sign-up"];
    // const isAuthPaths = authPaths.some((path) =>
    //   ctx.url.pathname.endsWith(path),
    // );

    // If the auth is good then set the session data using Astro Sessions
    if (response && response.ok && ctx.session) {
      const authData = (await response.clone().json()) as {
        user?: { id: string };
        session?: { token: string };
      };
      if (authData && authData.user && authData.session?.token) {
        await ctx.session.set("session", {
          userId: authData.user?.id,
          token: authData.session?.token,
        });
      }
    }

    // Destroy session data on sign out
    if (ctx.url.pathname.endsWith("/sign-out")) {
      await ctx.session?.destroy();

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
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
