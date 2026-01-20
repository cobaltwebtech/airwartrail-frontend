import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { subscription, useSession } from "@/lib/auth-client";

export function useSubStatus() {
	const [mounted, setMounted] = useState(false);
	const { data: session, isPending: sessionLoading } = useSession();

	// Track client-side mount for hydration safety
	useEffect(() => {
		setMounted(true);
	}, []);

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
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes (matches BillingInfo)
		gcTime: 1000 * 60 * 10, // Garbage collect after 10 minutes
		retry: 1, // Retry once on failure
		refetchOnWindowFocus: true, // Refetch when user returns to tab
		refetchOnMount: true, // Always refetch when component mounts
		refetchOnReconnect: true, // Refetch when network reconnects
	});

	if (error) {
		console.error("Error checking subscription status:", error);
	}

	return {
		session,
		isPremium,
		loading: sessionLoading || subLoading,
		mounted,
	};
}
