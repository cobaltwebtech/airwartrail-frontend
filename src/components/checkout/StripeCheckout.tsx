import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "./CheckoutForm";

// Load Stripe outside of component to avoid recreating on every render
// This uses the public key which is safe to expose
const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_KEY);

interface StripeCheckoutProps {
	onSuccess: () => void;
	onCancel: () => void;
}

export function StripeCheckout({ onSuccess, onCancel }: StripeCheckoutProps) {
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [customerId, setCustomerId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [textColor, setTextColor] = useState("#0f172a");
	const [backgroundColor, setBackgroundColor] = useState("#fbfff8");

	// Check if dark mode is active and use appropriate color
	// Using hex fallbacks since Stripe doesn't support oklch
	const updateColors = useCallback(() => {
		const isDark = document.documentElement.classList.contains("dark");
		setTextColor(isDark ? "#f7f7f7" : "#1a2e1a");
		setBackgroundColor(isDark ? "#323b2c" : "#fbfff8");
	}, []);

	useEffect(() => {
		updateColors();

		// Watch for class changes on the html element (theme toggle)
		const observer = new MutationObserver(() => {
			updateColors();
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => observer.disconnect();
	}, [updateColors]);

	useEffect(() => {
		// Create a SetupIntent when the component mounts
		const createSetupIntent = async () => {
			try {
				const response = await fetch("/api/stripe/create-setup-intent", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
				});

				const data = (await response.json()) as {
					clientSecret?: string;
					customerId?: string;
					error?: string;
				};

				if (!response.ok) {
					throw new Error(data.error || "Failed to initialize checkout");
				}

				setClientSecret(data.clientSecret ?? null);
				setCustomerId(data.customerId ?? null);
			} catch (err) {
				console.error("Error creating setup intent:", err);
				setError(
					err instanceof Error ? err.message : "Failed to initialize checkout",
				);
			} finally {
				setIsLoading(false);
			}
		};

		createSetupIntent();
	}, []);

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12">
				<Loader2 className="size-8 animate-spin text-primary" />
				<p className="text-muted-foreground">Initializing checkout...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12">
				<p className="text-red-500">{error}</p>
				<Button onClick={onCancel} variant="secondary">
					Go back
				</Button>
			</div>
		);
	}

	if (!clientSecret || !customerId) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-12">
				<p className="text-muted-foreground">Unable to initialize checkout</p>
				<Button onClick={onCancel} variant="destructive">
					Go back
				</Button>
			</div>
		);
	}

	const options: StripeElementsOptions = {
		clientSecret,
		appearance: {
			theme: "stripe",
			variables: {
				colorPrimary: textColor,
				colorBackground: backgroundColor,
				colorText: textColor,
				colorDanger: "#dc2626",
				fontFamily: "system-ui, sans-serif",
				borderRadius: "8px",
			},
		},
	};

	return (
		<Elements stripe={stripePromise} options={options}>
			<CheckoutForm
				customerId={customerId}
				onSuccess={onSuccess}
				onCancel={onCancel}
			/>
		</Elements>
	);
}
