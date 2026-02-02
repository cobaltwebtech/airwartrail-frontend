import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, ShieldUser } from "lucide-react";
import { useState } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { subscription, useSession } from "@/lib/auth-client";

// Define types for the subscription data
type Subscription = {
	id: string;
	plan: string;
	status:
		| "active"
		| "canceled"
		| "trialing"
		| "incomplete"
		| "incomplete_expired"
		| "past_due"
		| "unpaid"
		| "paused";
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	periodEnd?: Date;
	cancelAtPeriodEnd?: boolean;
};

function BillingInfoContent() {
	const queryClient = useQueryClient();
	const session = useSession();
	const [isManagingPayment, setIsManagingPayment] = useState(false);
	const [isUpgrading, setIsUpgrading] = useState(false);

	// Check if user is admin
	const isAdmin = session.data?.user?.role === "admin";

	// Query subscription data
	const { data: subscriptionData, isLoading: loading } = useQuery({
		queryKey: ["subscription", session.data?.user?.id],
		queryFn: async (): Promise<Subscription | null> => {
			const { data: subscriptions } = await subscription.list();
			const activeSubscription = subscriptions?.find(
				(sub) => sub.status === "active" || sub.status === "trialing",
			);
			return (activeSubscription as Subscription) || null;
		},
		enabled: !!session.data?.user,
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: true, // Refetch when user returns to tab
		refetchOnMount: true, // Always refetch when component mounts
	});

	const handleUpgrade = async () => {
		setIsUpgrading(true);
		try {
			await subscription.upgrade({
				plan: "premium",
				successUrl: "/subscribe/success",
				cancelUrl: window.location.href,
			});
			// Invalidate cache after upgrade to reflect new status
			await queryClient.invalidateQueries({
				queryKey: ["subscription", session.data?.user?.id],
			});
		} catch (error) {
			console.error("Error upgrading subscription:", error);
		} finally {
			setIsUpgrading(false);
		}
	};

	// Check if the user has an active subscription
	const hasActiveSubscription =
		subscriptionData?.status === "active" ||
		subscriptionData?.status === "trialing";
	const subscriptionPlan = subscriptionData?.plan || "Basic Plan";
	const isBasicPlan =
		!hasActiveSubscription || subscriptionPlan === "Basic Plan";

	// Format the subscription period end date
	const subscriptionEndDate = subscriptionData?.periodEnd
		? new Date(subscriptionData.periodEnd).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;

	const handleManagePayment = async () => {
		setIsManagingPayment(true);
		try {
			const response = await fetch("/api/stripe/portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					customerId: session.data?.user?.stripeCustomerId,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create portal session");
			}

			const { url } = (await response.json()) as { url: string };
			window.location.href = url;
		} catch (error) {
			console.error("Error creating portal session:", error);
		} finally {
			setIsManagingPayment(false);
		}
	};

	// Render a static version as a fallback to avoid rendering issues during hydration
	if (loading) {
		return (
			<Card className="row-span-2">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Billing Information</CardTitle>
							<CardDescription>
								Manage your subscription and billing details
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="row-span-2">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="leading-relaxed">
							Billing Information
						</CardTitle>
						<CardDescription>
							Manage your subscription and billing details
						</CardDescription>
					</div>
					<div className="bg-accent-1 rounded-full p-2">
						<CreditCard className="text-secondary-foreground size-6" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{/* Admin Badge - Only visible to admin users */}
				{isAdmin && (
					<div className="border-border bg-accent-6 mb-4 rounded-lg border p-4">
						<div className="flex items-center gap-2">
							<ShieldUser className="text-destructive size-6" />
							<p className="text-sm font-semibold">Administrator Account</p>
						</div>
						<p className="mt-1 text-xs">
							Since you are an admin you do not have an active subscription plan
							or payment account setup. You do have full access to all premium
							features without a subscription.
						</p>
					</div>
				)}
				<div>
					<div>
						<p className="text-muted-foreground text-sm font-medium">
							Current Plan
						</p>
						<p className="text-lg font-semibold">
							{isBasicPlan ? "Basic Plan" : "Premium"}
						</p>
						{!isBasicPlan && subscriptionData?.periodEnd && (
							<div className="text-muted-foreground mt-1 text-sm">
								{subscriptionData.cancelAtPeriodEnd?.valueOf() ? (
									<>
										<p>Subscription End Date</p>
										<p className="mb-4 text-card-foreground text-lg font-semibold">
											{subscriptionEndDate}
										</p>
										<p>
											Your subscription is set to cancel and not renew. If you
											would like to renew your subscription click the button
											below.
										</p>
									</>
								) : (
									<>
										<p>Renewal Date</p>
										<p className="mb-4 text-card-foreground text-lg font-semibold">
											{subscriptionEndDate}
										</p>
										<p>
											Your subscription is active. If you wish to cancel your
											subscription or need to update your payment details click
											the button below.
										</p>
									</>
								)}
							</div>
						)}
					</div>
				</div>
				<div className="mt-6 flex flex-wrap justify-between gap-4">
					{isBasicPlan && (
						<Button
							className="w-fit"
							onClick={handleUpgrade}
							disabled={isUpgrading}
						>
							{isUpgrading ? (
								<div className="flex items-center gap-2">
									<Loader2 className="size-4 animate-spin" />
									<span>Proceeding to payment...</span>
								</div>
							) : (
								"Upgrade to Premium Plan"
							)}
						</Button>
					)}
					<Button
						variant="secondary"
						className="w-fit"
						onClick={handleManagePayment}
						disabled={isManagingPayment}
					>
						{isManagingPayment ? (
							<div className="flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" />
								<span>Loading Please Wait...</span>
							</div>
						) : (
							"Manage Subscription & Payment"
						)}
					</Button>
				</div>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2">
				<p className="font-semibold">Need help or have questions?</p>
				<Button asChild>
					<a href="/contact">Contact Us</a>
				</Button>
			</CardFooter>
		</Card>
	);
}

/**
 * BillingInfo with QueryProvider wrapper
 *
 * Displays subscription status and allows users to manage billing.
 *
 * @example
 * ```astro
 * <BillingInfo client:load />
 * ```
 */
export function BillingInfo() {
	return (
		<QueryProvider showDevtools={false}>
			<BillingInfoContent />
		</QueryProvider>
	);
}

export default BillingInfo;
