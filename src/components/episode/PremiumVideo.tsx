import { subscription } from "@/lib/auth-client";
import { useSubStatus } from "@/lib/useSubStatus";
import { useVideoToken } from "@/lib/useVideoToken";
import { Button } from "../ui/button";
import { Loader2, BadgeAlert } from "lucide-react";

interface PremiumVideoProps {
  videoUrl: string;
  videoTitle?: string;
}

export function PremiumVideo({ videoUrl, videoTitle }: PremiumVideoProps) {
  // Use the React hooks for checking subscription status and generating secure token on video
  const { session, isPremium, loading, mounted } = useSubStatus();
  const { tokenQuery } = useVideoToken(videoUrl);

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-airwar-400 dark:bg-airwar-600 text-card-foreground my-10 rounded-lg p-4 text-center">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="font-semibold">
          Oh no! You're missing out on premium content!
        </p>
        <p className="text-sm">
          If you're seeing this then you're missing out on awesome premium
          content here which you can view if you upgrade to the Premium plan.
        </p>
        <p className="text-sm font-semibold">
          Subscribe now or login to view premium content.
        </p>
        <div className="mx-auto flex max-w-screen-sm flex-row justify-evenly gap-4">
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
      <div className="bg-airwar-400 dark:bg-airwar-600 text-card-foreground my-10 rounded-lg p-4 text-center">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="font-semibold">
          Oh no! You're missing out on premium content!
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
    const fullUrl = `${videoUrl}${tokenQuery}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

    return (
      <>
        {videoTitle && <h4>{videoTitle}</h4>}
        <div className="relative pt-[56.25%]">
          <iframe
            src={fullUrl}
            loading="eager"
            className="absolute top-0 aspect-video w-full rounded-lg border-0"
            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
        </div>
      </>
    );
  }
}
