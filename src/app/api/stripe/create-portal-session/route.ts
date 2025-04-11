import { stripeClient } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return new Response("Customer ID is required", { status: 400 });
    }

    // Create a portal session
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
