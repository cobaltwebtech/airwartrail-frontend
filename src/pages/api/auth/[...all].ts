import { auth } from "@/lib/auth";
import type { APIRoute } from "astro";

// Mark this route as server-side rendered
export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  try {
    console.log("Auth request received:", {
      method: ctx.request.method,
      url: ctx.request.url,
    });

    const response = await auth.handler(ctx.request);

    console.log("Auth response:", {
      status: response.status,
      statusText: response.statusText,
    });

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
