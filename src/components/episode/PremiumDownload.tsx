import { useSubStatus } from "@/lib/useSubStatus";
import { subscription } from "@/lib/auth-client";
import { Button } from "../ui/button";
import { Loader2, CircleX, BadgeAlert, Download } from "lucide-react";

interface PremiumDownloadProps {
  downloadUrl: string;
}

export function PremiumDownload({ downloadUrl }: PremiumDownloadProps) {
  // Use the React hooks for checking subscription status
  const { session, isPremium, loading, mounted } = useSubStatus();

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center text-red-500">
        <CircleX className="size-12" />
        <p className="text-lg font-semibold">
          Error loading content. Please refresh page.
        </p>
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

  if (isPremium) {
    return (
      <div>
        <p>
          You may download this content for your personal use by clicking the
          button below. High resolution images will be bundled in a .zip
          compressed format. If you would like to use any images for commercial
          purposes please send us a message on the{" "}
          <a href="/contact">contact page</a>.
        </p>
        <a href={downloadUrl} download>
          <Button>
            <Download />
            Download Bonus Images
          </Button>
        </a>
      </div>
    );
  }
}
