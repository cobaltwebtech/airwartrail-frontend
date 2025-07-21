import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export function useSubStatus() {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if authenticated and the subscription status
  useEffect(() => {
    async function checkPremiumStatus() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin first - admins get premium access
        if (session.user.role === "admin") {
          setIsPremium(true);
          setLoading(false);
          return;
        }

        // Otherwise check subscription status for regular users
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
    if (mounted) checkPremiumStatus();
  }, [session?.user, mounted]);

  return { session, isPremium, loading, mounted };
}
