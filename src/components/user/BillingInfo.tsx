import { useSession, subscription } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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

export function BillingInfo() {
  const { data: session } = useSession();
  const [subscriptionData, setSubscriptionData] = useState<Subscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isManagingPayment, setIsManagingPayment] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await subscription.upgrade({
        plan: "premium",
        successUrl: "/subscribe/success",
        cancelUrl: window.location.href,
      });
    } catch (error) {
      console.error("Error upgrading subscription:", error);
    } finally {
      setIsUpgrading(false);
    }
  };

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // Add a small delay to allow webhook to process
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Fetch the subscription data for the user
        const { data: subscriptions } = await subscription.list();
        const activeSubscription = subscriptions?.find(
          (sub) => sub.status === "active" || sub.status === "trialing",
        );
        console.log("Active subscription:", activeSubscription);

        setSubscriptionData(activeSubscription || null);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        // Add a delay to prevent race conditions with Stripe
        setTimeout(fetchSubscription, 2000);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchSubscription();
    }
  }, [session?.user]);

  // Check if the user has an active subscription
  const hasActiveSubscription =
    subscriptionData?.status === "active" ||
    subscriptionData?.status === "trialing";
  const subscriptionPlan = subscriptionData?.plan || "Free Tier";
  const isFreeTier = !hasActiveSubscription || subscriptionPlan === "Free Tier";

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
          customerId: session?.user.stripeCustomerId,
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
      <Card>
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
    <Card>
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
        <div className="grid gap-4">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Current Plan
            </p>
            <p className="text-lg font-semibold">
              {isFreeTier ? "Basic Plan" : "Premium"}
            </p>
            {!isFreeTier && subscriptionData?.periodEnd && (
              <div className="text-muted-foreground mt-1 text-sm">
                {subscriptionData.cancelAtPeriodEnd?.valueOf() ? (
                  <p>
                    Your subscription ends on {subscriptionEndDate}. If you
                    would like to reactivate your subscription click the button
                    below.
                  </p>
                ) : (
                  <p>
                    Your subscription is active and renews on{" "}
                    {subscriptionEndDate}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-4">
        {isFreeTier && (
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
      </CardFooter>
    </Card>
  );
}
