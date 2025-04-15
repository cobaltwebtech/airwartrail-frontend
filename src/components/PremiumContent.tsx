import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";

interface PremiumContentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumContent({ children, fallback }: PremiumContentProps) {
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

  // Show nothing during server-side rendering
  if (!mounted) {
    return null;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return fallback || <div>Please sign in to view this content</div>;
  }

  if (!isPremium) {
    return (
      fallback || (
        <div className="rounded-lg bg-gray-100 p-4">
          <p>This content is for premium subscribers only.</p>
          <button
            onClick={() =>
              subscription.upgrade({
                plan: "premium",
                successUrl: window.location.href,
                cancelUrl: window.location.href,
              })
            }
            className="mt-2 inline-block rounded bg-blue-500 px-4 py-2 text-white"
          >
            Upgrade to Premium
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
}
