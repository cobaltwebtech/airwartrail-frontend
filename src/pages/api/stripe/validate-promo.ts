import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createAuth, createStripeClient } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
	try {
		const auth = createAuth(env as Env);
		const stripeClient = createStripeClient(env.STRIPE_SECRET_KEY);

		// Require authentication
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = (await request.json()) as { code?: string };
		const { code } = body;

		if (!code || typeof code !== "string" || code.trim().length === 0) {
			return new Response(JSON.stringify({ error: "Promo code is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Look up active promotion codes matching the entered code
		const promoCodes = await stripeClient.promotionCodes.list({
			code: code.trim(),
			active: true,
			limit: 1,
			expand: ["data.promotion.coupon"],
		});

		if (promoCodes.data.length === 0) {
			return new Response(
				JSON.stringify({ error: "Invalid or expired promo code." }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		const promoCodeData = promoCodes.data[0];

		const coupon = promoCodeData.promotion.coupon;

		if (!coupon || typeof coupon === "string") {
			return new Response(
				JSON.stringify({ error: "Could not retrieve coupon details." }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Build a human-readable description
		let description: string;
		if (coupon.percent_off) {
			const durationText =
				coupon.duration === "once"
					? " your first month"
					: coupon.duration === "forever"
						? ""
						: coupon.duration === "repeating" && coupon.duration_in_months
							? ` for ${coupon.duration_in_months} months`
							: "";
			description = `${coupon.percent_off}% off${durationText}`;
		} else if (coupon.amount_off) {
			const currency = (coupon.currency || "usd").toUpperCase();
			const amount = new Intl.NumberFormat("en-US", {
				style: "currency",
				currency,
			}).format(coupon.amount_off / 100);
			description = `${amount} off`;
		} else {
			description = "Discount applied";
		}

		return new Response(
			JSON.stringify({
				promoCodeId: promoCodeData.id,
				description,
				percentOff: coupon.percent_off ?? null,
				amountOff: coupon.amount_off ?? null,
				currency: coupon.currency ?? null,
				duration: coupon.duration,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error validating promo code:", error);
		return new Response(
			JSON.stringify({
				error: "Could not validate promo code. Please try again.",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
