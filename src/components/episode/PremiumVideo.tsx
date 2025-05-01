import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Loader, BadgeAlert } from "lucide-react";

interface PremiumVideoProps {
  videoUrl: string;
}

function extractVideoId(url: string): string | null {
  // Example: https://iframe.mediadelivery.net/embed/759/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe
  const match = url.match(/\/embed\/[^/]+\/([^?]+)/);
  return match ? match[1] : null;
}

export function PremiumVideo({ videoUrl }: PremiumVideoProps) {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tokenQuery, setTokenQuery] = useState<string | null>(null);

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

  useEffect(() => {
    if (isPremium && videoUrl) {
      const videoId = extractVideoId(videoUrl);
      if (!videoId) return;
      fetch(`/api/bunny/videoToken?videoId=${videoId}`)
        .then((res) => res.json() as Promise<{ url: string }>)
        .then((data) => setTokenQuery(data.url))
        .catch((err) => {
          console.error("Failed to fetch video token", err);
          setTokenQuery(null);
        });
    }
  }, [isPremium, videoUrl]);

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
      <div className="bg-accent-4 text-secondary-foreground max-w-[480px] rounded-lg p-4">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="text-center font-semibold">
          Dang! You're missing out on premium content!
        </p>
        <p className="text-sm">
          If you're seeing this then you're missing out on awesome premium
          content here which you can view if you upgrade to the Premium plan.
        </p>
        <p className="text-sm">
          Subscribe now or login to view premium content.
        </p>
        <div className="flex flex-row justify-between gap-4">
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
      <div className="bg-accent-4 text-secondary-foreground max-w-[450px] rounded-lg p-4">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="text-center font-semibold">
          Dang! You're missing out on premium content!
        </p>
        <p className="text-sm">
          If you're seeing this then you're missing out on awesome premium
          content here which you can view if you upgrade to the Premium plan.
        </p>
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

  if (isPremium && tokenQuery) {
    const fullUrl = `${videoUrl}${tokenQuery}&autoplay=false&loop=false&muted=true&preload=true&responsive=true`;

    return (
      <div className="relative pt-[56.25%]">
        <iframe
          src={fullUrl}
          loading="eager"
          className="absolute top-0 h-full w-full border-0"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen={true}
        ></iframe>
      </div>
    );
  }
}
