import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { client } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function SubscriptionCard() {
  const { data: session, isPending } = useSession();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!session?.user) {
      console.error("User not logged in");
      return;
    }

    setIsSubscribing(true);
    try {
      const result = await client.subscription.upgrade({
        plan: "premium",
        successUrl: `${window.location.origin}/subscribe/success`,
        cancelUrl: `${window.location.origin}/subscribe`,
      });

      if (result.error) {
        console.error("Subscription error details:", {
          message: result.error.message,
          code: result.error.code,
          status: result.error.status,
          statusText: result.error.statusText,
        });
      }
    } catch (error) {
      console.error("Error initiating subscription:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return <div>Please log in to subscribe</div>;
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Premium Plan</CardTitle>
        <CardDescription>Get access to all premium features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">$9.99</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-green-500"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Access to all premium content</span>
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-green-500"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Ad-free experience</span>
          </li>
          <li className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-green-500"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Priority support</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubscribe}
          disabled={isSubscribing}
        >
          {isSubscribing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Proceeding to payment...</span>
            </div>
          ) : (
            "Upgrade to Premium Plan"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
