import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

interface PremiumVideoProps {
  videoUrl: string;
}

export function PremiumVideo({ videoUrl }: PremiumVideoProps) {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkPremiumStatus() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: subscriptions } = await subscription.list();
        const activeSubscription = subscriptions?.find(
          (sub) => sub.status === "active" || sub.status === "trialing",
        );
        setIsPremium(!!activeSubscription);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    }

    if (mounted) {
      checkPremiumStatus();
    }
  }, [session?.user, mounted]);
  if (!mounted) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return (
      <div className="bg-card rounded-lg p-4">
        <p>This content is for premium subscribers only.</p>
        <a href="/signup">
          <Button>Sign Up to Subscribe</Button>
        </a>
        <p>Already have an account?</p>
        <a href="/login">
          <Button>Login</Button>
        </a>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-card rounded-lg p-4">
        <p>This content is for premium subscribers only.</p>
        <Button
          onClick={() =>
            subscription.upgrade({
              plan: "premium",
              successUrl: "/subscribe/success",
              cancelUrl: window.location.href,
            })
          }
        >
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  return (
    <div className="relative pt-[56.25%]">
      <iframe
        src={`${videoUrl}?autoplay=false&loop=false&muted=true&preload=true&responsive=true`}
        loading="eager"
        className="absolute top-0 h-full w-full border-0"
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
        allowFullScreen={true}
      ></iframe>
    </div>
  );
}
