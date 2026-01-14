/**
 * React Query Provider Component
 *
 * Wrap your React components with this provider to enable TanStack Query.
 * This should be used at the top level of your React component tree.
 *
 * @example
 * ```astro
 * ---
 * import { QueryProvider } from '../components/providers/QueryProvider';
 * import VideoGrid from '../components/VideoGrid';
 * ---
 *
 * <QueryProvider client:load>
 *   <VideoGrid client:load />
 * </QueryProvider>
 * ```
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "../../lib/trpc/client";

interface QueryProviderProps {
	children: React.ReactNode;
	/** Show React Query devtools (defaults to true in development) */
	showDevtools?: boolean;
}

export function QueryProvider({
	children,
	showDevtools = true,
}: QueryProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{showDevtools && (
				<ReactQueryDevtools
					initialIsOpen={false}
					buttonPosition="bottom-left"
				/>
			)}
		</QueryClientProvider>
	);
}

export default QueryProvider;
