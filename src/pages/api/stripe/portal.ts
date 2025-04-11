import type { APIRoute } from "astro";
import { stripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return new Response("Customer ID is required", { status: 400 });
    }

    // Get the current hostname from the request
    const hostname = new URL(request.url).origin;

    // Create a portal session
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${hostname}/account`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
