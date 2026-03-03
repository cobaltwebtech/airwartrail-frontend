/**
 * Documents List Component
 *
 * Displays published documents in a responsive list with infinite scroll.
 * Fetches documents from the API via tRPC.
 * Requires an active subscription to view.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Pricing } from "@/components/partials/Pricing";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { trpcClient } from "@/lib/trpc";
import type { Document, ListDocumentsOutput } from "@/lib/trpc/types";
import { useSubStatus } from "@/lib/useSubStatus";

// ============================================================================
// Constants
// ============================================================================

const DOCUMENTS_PER_PAGE = 20;

// ============================================================================
// Types
// ============================================================================

interface DocumentsListProps {
	/** Whether this component requires a subscription to view */
	requiresSub: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const formatDate = (date: Date | string | null | undefined): string => {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const formatFileSize = (bytes: number | null | undefined): string => {
	if (!bytes) return "";
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	return `${mb.toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string | null) => {
	if (!mimeType) return "file";
	if (mimeType.includes("pdf")) return "pdf";
	if (mimeType.includes("word") || mimeType.includes("document")) return "word";
	if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
		return "excel";
	if (mimeType.includes("image")) return "image";
	return "file";
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * A single document item in the list.
 */
function DocumentItem({ document }: { document: Document }) {
	const iconType = getFileIcon(document.mimeType);

	return (
		<Item asChild>
			<a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
				<ItemMedia>
					<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
						<FileText className="size-5 text-muted-foreground" />
					</div>
				</ItemMedia>
				<ItemContent>
					<ItemTitle className="line-clamp-1 text-lg">
						{document.name}
					</ItemTitle>
					{document.description && (
						<ItemDescription className="line-clamp-2">
							{document.description}
						</ItemDescription>
					)}
				</ItemContent>
				<ItemFooter>
					<p className="text-xs text-muted-foreground">
						{formatDate(document.createdAt)}
					</p>
					<div>
						<span className="mr-1 text-xs text-muted-foreground">
							{formatFileSize(document.fileSize)}
						</span>
						<Badge className="uppercase">
							{iconType === "pdf"
								? "PDF"
								: iconType === "word"
									? "Word"
									: iconType === "excel"
										? "Excel"
										: iconType === "image"
											? "Image"
											: document.mimeType?.split("/")[1] || "Document"}
						</Badge>
					</div>
				</ItemFooter>
			</a>
		</Item>
	);
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DocumentListSkeleton({ count = 8 }: { count?: number }) {
	return (
		<ItemGroup className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{Array.from({ length: count }).map((_, i) => {
				const key = `document-skeleton-${i}`;
				return (
					<Item key={key}>
						<ItemMedia>
							<Skeleton className="size-10 rounded-lg" />
						</ItemMedia>
						<ItemContent>
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full mt-1" />
							<Skeleton className="h-4 w-2/3 mt-1" />
						</ItemContent>
						<ItemContent>
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-20 mt-1" />
						</ItemContent>
						<ItemFooter>
							<Skeleton className="h-4 w-24" />
						</ItemFooter>
					</Item>
				);
			})}
		</ItemGroup>
	);
}

// ============================================================================
// Main Component
// ============================================================================

function DocumentsListContent({ requiresSub }: DocumentsListProps) {
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const checkAuth = requiresSub;

	const loadMoreRef = useRef<HTMLDivElement>(null);

	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["documents", "list", "published", DOCUMENTS_PER_PAGE],
		queryFn: async ({ pageParam = 1 }) => {
			type ListDocumentsClient = {
				documents: {
					list: {
						query: (input: {
							limit?: number;
							page?: number;
							sortOrder?: "asc" | "desc";
							publishStatus?: "draft" | "published" | "archived";
						}) => Promise<ListDocumentsOutput>;
					};
				};
			};
			const client = trpcClient as unknown as ListDocumentsClient;
			return client.documents.list.query({
				limit: DOCUMENTS_PER_PAGE,
				page: pageParam,
				publishStatus: "published",
				sortOrder: "desc",
			});
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			const { page, totalPages } = lastPage.pagination;
			if (page < totalPages) return page + 1;
			return undefined;
		},
	});

	const allDocuments = useMemo(() => {
		return data?.pages.flatMap((page) => page.documents) ?? [];
	}, [data]);

	useEffect(() => {
		if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(loadMoreRef.current);

		return () => {
			observer.disconnect();
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (checkAuth && (!mounted || authLoading)) {
		return (
			<section className="w-full space-y-6">
				<DocumentListSkeleton count={8} />
			</section>
		);
	}

	if (checkAuth && (!session?.user || !isPremium)) {
		return <Pricing />;
	}

	if (error) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-8 text-center text-destructive">
				<FileText className="mb-4 size-16" />
				<p className="text-lg font-semibold">Failed to load documents</p>
				<p className="mt-2 text-sm text-muted-foreground">
					An unexpected error occurred. Please try again later."
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<section className="w-full space-y-6">
				<DocumentListSkeleton count={8} />
			</section>
		);
	}

	if (allDocuments.length === 0) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-12 text-center">
				<FileText className="mb-4 size-16 text-muted-foreground" />
				<p className="text-lg font-semibold">No documents yet</p>
				<p className="mt-2 text-sm text-muted-foreground">
					Check back soon for new documents and content.
				</p>
			</div>
		);
	}

	return (
		<section className="w-full space-y-6">
			<ItemGroup className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{allDocuments.map((doc) => (
					<DocumentItem key={doc.id} document={doc} />
				))}
			</ItemGroup>

			<div ref={loadMoreRef} className="flex justify-center py-4">
				{isFetchingNextPage && (
					<div className="flex items-center text-muted-foreground">
						<Loader2 className="mr-2 size-5 animate-spin" />
						Loading more documents...
					</div>
				)}
				{!hasNextPage && allDocuments.length > 0 && (
					<p className="text-xs text-muted-foreground">
						Showing {allDocuments.length} documents
					</p>
				)}
			</div>
		</section>
	);
}

// ============================================================================
// Exported Component with QueryProvider
// ============================================================================

export function DocumentsList(props: DocumentsListProps) {
	return (
		<QueryProvider>
			<DocumentsListContent {...props} />
		</QueryProvider>
	);
}

export default DocumentsList;
