import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { StripeCheckout } from "./StripeCheckout";

export function CheckoutProcess() {
	const { data: session, isPending } = useSession();
	const [isSuccess, setIsSuccess] = useState(false);

	const handleCheckoutSuccess = () => {
		setIsSuccess(true);
		// Redirect to success page after a brief moment
		setTimeout(() => {
			window.location.href = "/subscribe/checkout/success";
		}, 1500);
	};

	const handleCheckoutCancel = () => {
		window.location.href = "/subscribe/upgrade";
	};

	if (isPending) {
		return (
			<div className="inline-flex gap-4">
				<Loader2 className="h-6 w-6 animate-spin" />

				<p>Loading...</p>
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="mx-auto flex max-w-3xl flex-col gap-8 sm:flex-row">
				<Card className="basis-1/2 p-4">
					<CardTitle className="text-xl">Create an Account</CardTitle>
					<CardDescription>
						If you do not have an account, please sign up first to subscribe to
						the premium plan.
					</CardDescription>
					<a href="/auth/signup">
						<Button variant="secondary">Sign Up to Subscribe</Button>
					</a>
				</Card>
				<div className="text-accent-foreground flex basis-1/5 items-center justify-center text-xl font-bold">
					- OR -
				</div>
				<Card className="basis-1/2 p-4">
					<CardTitle className="text-xl">Login to Account</CardTitle>
					<CardDescription>
						If you have an account, please login first to upgrade to the premium
						plan.
					</CardDescription>
					<a href="/auth/login">
						<Button>Login to Upgrade</Button>
					</a>
				</Card>
			</div>
		);
	}

	// Show success state
	if (isSuccess) {
		return (
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
				<div className="rounded-full bg-green-100 p-3">
					<Check className="size-12 text-green-500" />
				</div>
				<h2 className="text-2xl font-bold">Subscription Successful!</h2>
				<Loader2 className="size-6 animate-spin text-primary" />
			</div>
		);
	}

	return (
		// Stripe embedded checkout form
		<div className="mx-auto max-w-3xl">
			<h2 className="text-2xl">Complete Your Subscription</h2>
			<p className="mb-4">
				Enter your payment details below to subscribe to the Premium plan
			</p>
			<StripeCheckout
				onSuccess={handleCheckoutSuccess}
				onCancel={handleCheckoutCancel}
			/>
		</div>
	);
}
