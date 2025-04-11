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
  currentPeriodEnd?: Date;
  paymentMethod?: {
    card?: {
      brand: string;
      last4: string;
    };
  };
  limits?: Record<string, number>;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  seats?: number;
};

export function BillingInfo() {
  const { data: session } = useSession();
  const [subscriptionData, setSubscriptionData] = useState<Subscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        console.log("Fetching subscription data...");
        const { data: subscriptions } = await subscription.list();
        console.log("Raw subscription data:", subscriptions);

        // Get the active subscription if it exists
        const activeSubscription = subscriptions?.find(
          (sub) => sub.status === "active" || sub.status === "trialing",
        );
        console.log("Active subscription:", activeSubscription);

        setSubscriptionData(activeSubscription || null);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      console.log("Session user:", session.user);
      fetchSubscription();
    }
  }, [session?.user]);

  // Check if the user has an active subscription
  const hasActiveSubscription =
    subscriptionData?.status === "active" ||
    subscriptionData?.status === "trialing";
  const subscriptionPlan = subscriptionData?.plan || "Free Tier";
  const isFreeTier = !hasActiveSubscription || subscriptionPlan === "Free Tier";

  // Format renewal date if available
  const renewalDate = subscriptionData?.currentPeriodEnd
    ? new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()
    : null;

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      if (!subscriptionData?.stripeCustomerId) {
        throw new Error("No active subscription found");
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: subscriptionData.stripeCustomerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating portal session:", error);
    } finally {
      setIsManagingSubscription(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </CardContent>
      </Card>
    );
  }

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
          <div className="bg-primary/10 rounded-full p-2">
            <CreditCard className="text-primary h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Current Plan
            </p>
            <p className="text-lg font-medium">
              {isFreeTier ? "Free Tier" : subscriptionPlan}
            </p>
            {!isFreeTier && renewalDate && (
              <p className="text-muted-foreground mt-1 text-sm">
                Renews on {renewalDate}
              </p>
            )}
          </div>

          {!isFreeTier && subscriptionData?.paymentMethod?.card && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Billing Method
              </p>
              <p className="text-lg">
                {subscriptionData.paymentMethod.card.brand} ending in{" "}
                {subscriptionData.paymentMethod.card.last4}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isFreeTier ? (
          <Button
            className="w-full"
            onClick={() =>
              subscription.upgrade({
                plan: "premium",
                successUrl: window.location.href,
                cancelUrl: window.location.href,
              })
            }
          >
            Upgrade to Premium
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageSubscription}
            disabled={isManagingSubscription}
          >
            {isManagingSubscription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading please wait...
              </>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
