import type { APIRoute } from "astro";
import { stripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { customerId, email } = await request.json();

    if (!customerId || !email) {
      return new Response("Customer ID and email are required", {
        status: 400,
      });
    }

    // Update the customer's email in Stripe
    await stripeClient.customers.update(customerId, {
      email: email,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error updating email in Stripe:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
