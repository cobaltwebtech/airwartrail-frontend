import { useQuery } from "@tanstack/react-query";
import { subscription, useSession } from "@/lib/auth-client";

export function useSubStatus() {
	const { data: session, isPending: sessionLoading } = useSession();

	const {
		data: isPremium = false,
		isLoading: subLoading,
		error,
	} = useQuery({
		queryKey: ["subscription-status", session?.user?.id],
		queryFn: async () => {
			// Check if user is admin first - admins get premium access
			if (session?.user?.role === "admin") {
				return true;
			}

			// Otherwise check subscription status for regular users
			const { data: subscriptions } = await subscription.list();
			const activeSubscription = subscriptions?.find(
				(sub) => sub.status === "active" || sub.status === "trialing",
			);
			return !!activeSubscription;
		},
		enabled: !!session?.user, // Only run when user is authenticated
		staleTime: 1000 * 60 * 60, // Cache for 1 hour
		retry: 1, // Retry once on failure
	});

	if (error) {
		console.error("Error checking subscription status:", error);
	}

	return {
		session,
		isPremium,
		loading: sessionLoading || subLoading,
	};
}
