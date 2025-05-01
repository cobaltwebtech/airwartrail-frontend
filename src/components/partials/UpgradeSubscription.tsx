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
import { Loader2, Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      // Initiate the upgrade process to Stripe checkout
      const result = await client.subscription.upgrade({
        plan: "premium",
        successUrl: `${window.location.origin}/subscribe/success`,
        cancelUrl: `${window.location.origin}/subscribe/upgrade`,
      });

      if (result.error) {
        console.error("Subscription error details:", {
          message: result.error.message,
          code: result.error.code,
          status: result.error.status,
          statusText: result.error.statusText,
        });

        // Check for already subscribed error (status 400)
        if (result.error.status === 400) {
          toast.error("Error: You are already subscribed to Premium Tier.");
        } else {
          toast.error(result.error.message || "Failed to upgrade subscription");
        }
      }
    } catch (error) {
      console.error("Error initiating subscription:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
        toast.error(error.message || "Failed to upgrade subscription");
      }
    } finally {
      setIsSubscribing(false);
    }
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
      <div className="mx-auto flex max-w-screen-md flex-col gap-8 sm:flex-row">
        <Card className="basis-1/2 p-4">
          <CardTitle className="text-xl">Create an Account</CardTitle>
          <CardDescription>
            If you do not have an account, please sign up first to subscribe to
            the premium plan.
          </CardDescription>
          <a href="/signup">
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
          <a href="/login">
            <Button>Login to Upgrade</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {/* Premium Plan card with upgrade process to Stripe checkout */}
      <Card className="border-primary col-span-2 flex h-full w-full flex-col border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Premium</CardTitle>
          <CardDescription>
            Access to all premium and exclusive content
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="mb-6 text-3xl font-bold">
            $9
            <sup className="superscript text-base">.99</sup>
            <span className="text-base font-normal text-gray-500">
              &nbsp; /month
            </span>
          </p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              All features from Basic plan plus...
            </li>
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Full-length films, interviews, and other video presentations
            </li>
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Bonus content of high-res photographs, historical materials, War
              Department productions, and much more
            </li>
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Access to episodes and content early before everyone else
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubscribe}
            disabled={isSubscribing}
          >
            {isSubscribing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Proceeding to payment...</span>
              </div>
            ) : (
              <>
                <UserPlus className="size-6" />
                <span className="text-lg font-bold">
                  Upgrade to Premium Plan
                </span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Free Plan */}
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">Basic</CardTitle>
          <CardDescription>Get started with our entry plan</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="mb-6 text-3xl font-bold">
            $0
            <span className="text-base font-normal text-gray-500">/month</span>
          </p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Bi-weekly release of episodes and other content
            </li>
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Sneak previews of documentary films
            </li>
            <li className="flex items-center">
              <Check className="mr-2 size-5 text-green-500" />
              Sneak previews of interviews of WWII individuals
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <a href="/episodes" className="w-full">
            <Button className="w-full" variant="secondary">
              Stay on Free Tier
            </Button>
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
