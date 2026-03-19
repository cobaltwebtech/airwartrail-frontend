import {
	AddressElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import type { StripeAddressElementChangeEvent } from "@stripe/stripe-js";
import {
	AlertCircle,
	BadgeCheck,
	BadgePercent,
	CreditCard,
	Loader2,
	Lock,
	MapPin,
	Receipt,
	TriangleAlert,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

interface CheckoutFormProps {
	customerId: string;
	onSuccess: () => void;
	onCancel: () => void;
}

interface TaxInfo {
	subtotal: number;
	tax: number;
	discount: number;
	total: number;
	currency: string;
}

interface PromoDiscount {
	promoCodeId: string;
	description: string;
	percentOff: number | null;
	amountOff: number | null;
	currency: string | null;
	duration: string;
}

export function CheckoutForm({
	customerId,
	onSuccess,
	onCancel,
}: CheckoutFormProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [isProcessing, setIsProcessing] = useState(false);
	const [isCalculatingTax, setIsCalculatingTax] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null);
	const [addressComplete, setAddressComplete] = useState(false);
	const [promoCode, setPromoCode] = useState("");
	const [promoDiscount, setPromoDiscount] = useState<PromoDiscount | null>(
		null,
	);
	const [promoError, setPromoError] = useState<string | null>(null);
	const [isValidatingPromo, setIsValidatingPromo] = useState(false);
	const [lastAddress, setLastAddress] = useState<
		StripeAddressElementChangeEvent["value"]["address"] | null
	>(null);

	// Format currency amount from cents
	const formatAmount = (amount: number, currency: string) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	// Calculate tax when address changes
	const calculateTax = useCallback(
		async (
			address: StripeAddressElementChangeEvent["value"]["address"],
			promoCodeId?: string,
		) => {
			if (!address.postal_code || !address.country) {
				return;
			}

			setIsCalculatingTax(true);
			try {
				const response = await fetch("/api/stripe/calculate-tax", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						customerId,
						address: {
							line1: address.line1,
							line2: address.line2,
							city: address.city,
							state: address.state,
							postal_code: address.postal_code,
							country: address.country,
						},
						promoCodeId,
					}),
				});

				const data = (await response.json()) as TaxInfo & { error?: string };

				if (!response.ok) {
					const errorMsg = data.error || "Unable to calculate taxes";
					toast.error("Tax Calculation Error", { description: errorMsg });
					setErrorMessage(errorMsg);
					setTaxInfo(null);
					return;
				}

				setTaxInfo(data);
			} catch (error) {
				const errorMsg =
					error instanceof Error
						? error.message
						: "An unexpected error occurred";
				toast.error("Tax Calculation Error", { description: errorMsg });
				setErrorMessage(errorMsg);
				setTaxInfo(null);
			} finally {
				setIsCalculatingTax(false);
			}
		},
		[customerId],
	);

	// Validate promo code against Stripe
	const handleApplyPromo = useCallback(async () => {
		if (!promoCode.trim()) return;

		setPromoError(null);
		setIsValidatingPromo(true);

		try {
			const response = await fetch("/api/stripe/validate-promo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ code: promoCode.trim() }),
			});

			const data = (await response.json()) as PromoDiscount & {
				error?: string;
			};

			if (!response.ok || data.error) {
				setPromoError(data.error || "Invalid promo code.");
				setPromoDiscount(null);
				return;
			}

			setPromoDiscount(data);
			toast.success("Promo code applied!", { description: data.description });

			// Recalculate tax with the promo discount
			if (lastAddress) {
				calculateTax(lastAddress, data.promoCodeId);
			}
		} catch {
			setPromoError("Could not validate promo code. Please try again.");
			setPromoDiscount(null);
		} finally {
			setIsValidatingPromo(false);
		}
	}, [promoCode, lastAddress, calculateTax]);

	const handleRemovePromo = useCallback(() => {
		setPromoDiscount(null);
		setPromoCode("");
		setPromoError(null);

		// Recalculate tax without the discount
		if (lastAddress) {
			calculateTax(lastAddress);
		}
	}, [lastAddress, calculateTax]);

	// Handle address change
	const handleAddressChange = useCallback(
		(event: StripeAddressElementChangeEvent) => {
			setAddressComplete(event.complete);
			if (event.complete) {
				setLastAddress(event.value.address);
				calculateTax(event.value.address, promoDiscount?.promoCodeId);
			} else {
				setLastAddress(null);
				setTaxInfo(null);
			}
		},
		[calculateTax, promoDiscount],
	);

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		setIsProcessing(true);

		try {
			// Confirm the SetupIntent to save the payment method
			const { error: setupError, setupIntent } = await stripe.confirmSetup({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/subscribe/success`,
				},
				redirect: "if_required",
			});

			if (setupError) {
				const errorMsg =
					setupError.message ||
					"An error occurred while processing your payment";
				toast.error("Payment Error", { description: errorMsg });
				setErrorMessage(errorMsg);
				setIsProcessing(false);
				return;
			}

			if (!setupIntent || setupIntent.status !== "succeeded") {
				const errorMsg = "Payment setup was not completed. Please try again.";
				toast.error("Payment Setup Failed", { description: errorMsg });
				setErrorMessage(errorMsg);
				setIsProcessing(false);
				return;
			}

			// Get the payment method ID from the SetupIntent
			const paymentMethodId = setupIntent.payment_method as string;

			// Create the subscription using our API
			const response = await fetch("/api/stripe/create-subscription", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					paymentMethodId,
					customerId,
					promoCodeId: promoDiscount?.promoCodeId ?? undefined,
				}),
			});

			const result = (await response.json()) as {
				status?: string;
				error?: string;
				clientSecret?: string;
				subscriptionId?: string;
			};

			if (!response.ok) {
				const errorMsg = result.error || "Failed to create subscription";
				toast.error("Subscription Error", { description: errorMsg });
				setErrorMessage(errorMsg);
				setIsProcessing(false);
				return;
			}

			// Handle 3D Secure authentication if required
			if (result.status === "requires_action" && result.clientSecret) {
				const { error: confirmError } = await stripe.confirmCardPayment(
					result.clientSecret,
				);

				if (confirmError) {
					const errorMsg =
						confirmError.message || "Payment authentication failed";
					toast.error("Authentication Failed", { description: errorMsg });
					setErrorMessage(errorMsg);
					setIsProcessing(false);
					return;
				}
			}

			// Success!
			onSuccess();
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : "An unexpected error occurred";
			toast.error("Checkout Error", { description: errorMsg });
			setErrorMessage(errorMsg);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4 overflow-x-hidden w-full"
		>
			{/* Billing Address */}
			<Card>
				<CardHeader className="flex items-center gap-2 px-4 sm:px-6">
					<MapPin className="size-5" />
					<CardTitle>Billing Address</CardTitle>
				</CardHeader>
				<CardContent className="px-4 sm:px-6">
					<AddressElement
						options={{
							mode: "billing",
							defaultValues: {
								address: {
									country: "US",
								},
							},
						}}
						onChange={handleAddressChange}
					/>
				</CardContent>
			</Card>

			{/* Promo Code */}
			<Card>
				<CardHeader className="flex items-center flex-wrap gap-2 px-4 sm:px-6">
					<BadgePercent className="size-5" />
					<CardTitle>Promo Code</CardTitle>
					<CardDescription>
						If you have a promotional discount code enter it here.
					</CardDescription>
				</CardHeader>
				<CardContent className="px-4 sm:px-6">
					{promoDiscount ? (
						<div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-3">
							<div className="flex items-center gap-2">
								<BadgeCheck className="size-4 text-green-600" />
								<div>
									<p className="font-medium text-sm uppercase">{promoCode}</p>
									<p className="text-xs text-muted-foreground">
										{promoDiscount.description}
									</p>
								</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleRemovePromo}
								className="size-8 p-0"
							>
								<X className="size-4" />
								<span className="sr-only">Remove promo code</span>
							</Button>
						</div>
					) : (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Input
									value={promoCode}
									onChange={(e) => {
										setPromoCode(e.target.value);
										setPromoError(null);
									}}
									placeholder="Enter promo code"
									className="uppercase"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleApplyPromo();
										}
									}}
								/>
								<Button
									type="button"
									variant="secondary"
									onClick={handleApplyPromo}
									disabled={!promoCode.trim() || isValidatingPromo}
								>
									{isValidatingPromo ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										"Apply"
									)}
								</Button>
							</div>
							{promoError && (
								<p className="flex items-center gap-1 text-sm text-destructive">
									<TriangleAlert />
									<span>{promoError}</span>
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Order Summary with Tax */}
			<Card>
				<CardHeader className="flex items-center gap-2 px-4 sm:px-6">
					<Receipt className="size-5" />
					<CardTitle>Order Summary</CardTitle>
				</CardHeader>
				<CardContent className="px-4 sm:px-6">
					<div className="flex items-center justify-between">
						<span>Premium Plan (Monthly)</span>
						<span>$9.99</span>
					</div>

					{promoDiscount && (
						<div className="flex items-center justify-between text-green-600">
							<span>Discount ({promoDiscount.description})</span>
							<span>
								{promoDiscount.percentOff
									? `-${promoDiscount.percentOff}%`
									: promoDiscount.amountOff
										? `-${formatAmount(promoDiscount.amountOff, promoDiscount.currency || "usd")}`
										: "Applied"}
							</span>
						</div>
					)}

					{isCalculatingTax && (
						<div className="flex items-center justify-between text-muted-foreground">
							<span>Calculating tax...</span>
							<Loader2 className="size-4 animate-spin" />
						</div>
					)}

					{taxInfo && !isCalculatingTax && (
						<>
							<div className="flex items-center justify-between text-muted-foreground">
								<span>Subtotal</span>
								<span>{formatAmount(taxInfo.subtotal, taxInfo.currency)}</span>
							</div>
							{taxInfo.discount > 0 && (
								<div className="flex items-center justify-between text-green-600">
									<span>Discount Applied</span>
									<span>
										-{formatAmount(taxInfo.discount, taxInfo.currency)}
									</span>
								</div>
							)}
							<div className="flex items-center justify-between text-muted-foreground">
								<span>Sales Tax</span>
								<span>{formatAmount(taxInfo.tax, taxInfo.currency)}</span>
							</div>
							<div className="border-t pt-2">
								<div className="flex items-center justify-between font-semibold">
									<span>Total</span>
									<span>
										{formatAmount(taxInfo.total, taxInfo.currency)}/mo
									</span>
								</div>
							</div>
						</>
					)}

					{!taxInfo && !isCalculatingTax && (
						<div className="border-t pt-2">
							<p className="flex items-center justify-between font-semibold">
								<span>Total</span>
								<span>$9.99/mo + tax</span>
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Enter your billing address to see final total with tax.
							</p>
						</div>
					)}
				</CardContent>
				<CardFooter className="flex-col items-start gap-2 px-4 sm:px-6">
					<p className="text-xs text-muted-foreground">
						Your subscription will renew monthly. Cancel anytime.
					</p>
					<p className="flex gap-1 items-center text-xs text-muted-foreground">
						<Lock className="size-3" />
						<span>Your payment is processed securely by Stripe.</span>
					</p>
					{/* Error Message */}
					{errorMessage && (
						<div className="mx-auto bg-destructive/50 p-4 rounded-lg flex items-center gap-2">
							<AlertCircle className="size-6 shrink-0" />
							<p>{errorMessage}</p>
						</div>
					)}
				</CardFooter>
			</Card>

			{/* Payment Element */}
			<Card>
				<CardHeader className="flex items-center gap-2 px-4 sm:px-6">
					<CreditCard className="size-5" />
					<CardTitle>Payment Details</CardTitle>
				</CardHeader>
				<CardContent className="px-4 sm:px-6">
					<PaymentElement
						options={{
							layout: "tabs",
						}}
					/>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<div className="flex gap-4">
				<Button
					variant="outline"
					onClick={onCancel}
					disabled={isProcessing}
					className="basis-1/4"
					size="lg"
				>
					Cancel
				</Button>
				<Button
					disabled={!stripe || !elements || isProcessing || !addressComplete}
					className="flex-auto text-lg"
					size="lg"
				>
					{isProcessing ? (
						<>
							<Loader2 className="size-6 animate-spin" />
							Processing...
						</>
					) : (
						<>Subscribe Now</>
					)}
				</Button>
			</div>

			{/* Terms */}
			<p className="md:col-span-full text-center text-xs text-muted-foreground">
				By subscribing, you agree to our{" "}
				<a href="/terms-of-service" className="underline hover:text-foreground">
					Terms of Service
				</a>{" "}
				and{" "}
				<a href="/privacy-policy" className="underline hover:text-foreground">
					Privacy Policy
				</a>
				.
			</p>
		</form>
	);
}
