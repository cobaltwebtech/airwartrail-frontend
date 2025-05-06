import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface FreeVideoProps {
  videoUrl: string;
}

function extractVideoId(url: string): string | null {
  // Inspect and extract the paramters from the embed URL
  const match = url.match(/\/embed\/[^/]+\/([^?]+)/);
  return match ? match[1] : null;
}

export function FreeVideo({ videoUrl }: FreeVideoProps) {
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
    if (!isPremium && videoUrl) {
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

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if ((!isPremium || !session?.user) && tokenQuery) {
    const fullUrl = `${videoUrl}${tokenQuery}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

    return (
      <>
        <p>
          If you are not currently subscribed to our Premium Plan, please{" "}
          <a href="/subscribe">subscribe now</a> to view the full length video
          or you can watch the short clip below.
        </p>
        <div className="relative pt-[56.25%]">
          <iframe
            src={fullUrl}
            loading="eager"
            className="absolute top-0 h-full w-full rounded-lg border-0"
            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
        </div>
      </>
    );
  }
}
