import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Loader } from "lucide-react";

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
    return (
      <div className="flex justify-center">
        <Loader className="size-12 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader className="size-12 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-chart-4 max-w-[450px] rounded-lg p-4">
        <p>
          This content is for premium subscribers only. <br />
          Subscribe now or login to view premium content.
        </p>
        <div className="flex flex-row gap-x-4">
          <a href="/signup">
            <Button>Sign Up to Subscribe</Button>
          </a>
          <a href="/login">
            <Button variant="secondary">Login</Button>
          </a>
        </div>
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
