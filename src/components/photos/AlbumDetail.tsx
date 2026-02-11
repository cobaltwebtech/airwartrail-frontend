/**
 * Album Detail Component
 *
 * Displays all images within a single album in a responsive masonry-style grid.
 * Fetches album data by slug from the Cloudflare Images API via tRPC.
 * Handles signed URL generation for images that require it.
 * Requires an active subscription to view.
 */

import { useQueries, useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Download,
	ImageIcon,
	Images,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pricing } from "@/components/partials/Pricing";
import {
	Lightbox,
	LightboxClose,
	LightboxContent,
	LightboxTitle,
} from "@/components/photos/Lightbox";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpcClient } from "@/lib/trpc";
import type {
	AlbumImage,
	GetAlbumOutput,
	SignUrlInput,
	SignUrlOutput,
} from "@/lib/trpc/types";
import { useSubStatus } from "@/lib/useSubStatus";

// ============================================================================
// Constants
// ============================================================================

const SIGNED_URL_STALE_TIME = 60 * 60 * 1000; // 1 hour

/** Cloudflare Images variants used for responsive srcset in the lightbox */
const LIGHTBOX_VARIANTS = [
	{ name: "sm", width: 640 },
	{ name: "md", width: 768 },
	{ name: "lg", width: 1024 },
	{ name: "xl", width: 1280 },
	{ name: "2xl", width: 1920 },
	{ name: "3xl", width: 2560 },
] as const;

// ============================================================================
// Types
// ============================================================================

interface AlbumDetailProps {
	/** The album slug from the URL */
	albumSlug: string;
	/** Whether this component requires a subscription to view */
	requiresSub: boolean;
}

// ============================================================================
// tRPC Client Types (typed wrappers for cast)
// ============================================================================

type GetAlbumClient = {
	cfImages: {
		albums: {
			getAlbum: {
				query: (input: { slug: string }) => Promise<GetAlbumOutput>;
			};
		};
	};
};

type SignUrlClient = {
	cfImages: {
		signedUrls: {
			signUrl: {
				query: (input: SignUrlInput) => Promise<SignUrlOutput>;
			};
		};
	};
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Renders a single image in the album grid.
 * Uses public thumbnail variant which does not require signed URLs.
 */
function AlbumImageCard({
	albumImage,
	onClick,
}: {
	albumImage: AlbumImage;
	onClick: () => void;
}) {
	const { image } = albumImage;

	// Use public thumbnail variant directly without signed URL
	const url = `${image.deliveryUrl}/thumbnail`;

	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative w-full cursor-pointer overflow-hidden rounded-lg break-inside-avoid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<img
				src={url}
				alt={albumImage.caption || image.altText || "Album photo"}
				className="size-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
				loading="lazy"
			/>

			{/* Hover overlay with caption */}
			{albumImage.caption && (
				<div className="absolute inset-x-0 bottom-0 translate-y-full rounded-b-lg bg-linear-to-t from-black/70 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
					<p className="text-sm text-white">{albumImage.caption}</p>
				</div>
			)}
		</button>
	);
}

/**
 * Lightbox overlay for viewing a full-size image.
 * Uses Radix Dialog for focus trapping, scroll locking, and Escape handling.
 */
function ImageLightbox({
	albumImage,
	onPrev,
	onNext,
	hasPrev,
	hasNext,
	currentIndex,
	totalImages,
}: {
	albumImage: AlbumImage;
	onPrev: () => void;
	onNext: () => void;
	hasPrev: boolean;
	hasNext: boolean;
	currentIndex: number;
	totalImages: number;
}) {
	const { image } = albumImage;
	const imageId = image.id;
	const [isLoadingImage, setIsLoadingImage] = useState(true);
	const prevImageIdRef = useRef(imageId);

	// Reset loading state when image changes (without the useEffect dep lint issue)
	if (prevImageIdRef.current !== imageId) {
		prevImageIdRef.current = imageId;
		setIsLoadingImage(true);
	}

	// Fetch signed URLs for all responsive variants (full-size lightbox view)
	const signedUrlQueries = useQueries({
		queries: LIGHTBOX_VARIANTS.map((variant) => ({
			queryKey: ["cfImages", "signedUrls", "signUrl", imageId, variant.name],
			queryFn: async () => {
				const client = trpcClient as unknown as SignUrlClient;
				return client.cfImages.signedUrls.signUrl.query({
					imageId: imageId,
					variant: variant.name,
					expirationSeconds: 3600,
				});
			},
			enabled: image.requireSignedURLs,
			staleTime: SIGNED_URL_STALE_TIME,
			retry: false,
		})),
	});

	// Build responsive srcSet and fallback src from signed or public URLs
	const getVariantUrl = (index: number) => {
		const variant = LIGHTBOX_VARIANTS[index];
		if (image.requireSignedURLs && signedUrlQueries[index]?.data?.url) {
			return signedUrlQueries[index].data.url;
		}
		return `${image.deliveryUrl}/${variant.name}`;
	};

	const srcSet = LIGHTBOX_VARIANTS.map(
		(variant, i) => `${getVariantUrl(i)} ${variant.width}w`,
	).join(", ");

	// Use the xl variant as the fallback src for balance between resolution and file size
	const xlVariantIndex = LIGHTBOX_VARIANTS.findIndex((v) => v.name === "xl");
	const url = getVariantUrl(xlVariantIndex);

	// Download handler — streams the original image via our API proxy
	const handleDownload = async () => {
		try {
			const res = await fetch(`/api/images/download/${image.id}`);
			if (!res.ok) throw new Error(`Download failed: ${res.status}`);

			// Extract filename from Content-Disposition header if available
			const disposition = res.headers.get("Content-Disposition");
			const fileNameMatch = disposition?.match(/filename="?(.+?)"?$/i);
			const fileName = fileNameMatch?.[1] || "image";

			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(blobUrl);
		} catch {
			// Fallback: open the image URL directly
			window.open(url, "_blank");
		}
	};

	// Handle image loading
	const handleImageLoad = () => {
		setIsLoadingImage(false);
	};

	// Arrow key navigation (Escape is handled by Radix Dialog)
	const handleArrowNav = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "ArrowLeft" && hasPrev) {
				setIsLoadingImage(true);
				onPrev();
			}
			if (e.key === "ArrowRight" && hasNext) {
				setIsLoadingImage(true);
				onNext();
			}
		},
		[hasPrev, hasNext, onPrev, onNext],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleArrowNav);
		return () => window.removeEventListener("keydown", handleArrowNav);
	}, [handleArrowNav]);

	return (
		<LightboxContent aria-label={`Image ${currentIndex + 1} of ${totalImages}`}>
			<LightboxTitle>
				Image {currentIndex + 1} of {totalImages}
			</LightboxTitle>

			{/* Top bar: counter + actions */}
			<div className="flex w-full shrink-0 items-center justify-between p-4">
				<Badge>
					{currentIndex + 1} / {totalImages}
				</Badge>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={handleDownload}
								variant="reversed"
								size="icon"
								aria-label="Download original image"
							>
								<Download className="size-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Download Original</TooltipContent>
					</Tooltip>
					<LightboxClose />
				</div>
			</div>

			{/* Main image area */}
			<div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-14 md:px-20">
				{/* Loading overlay */}
				{isLoadingImage && (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
						<Loader2 className="size-12 animate-spin text-white" />
						<p className="mt-4 text-sm text-white/60">Loading Image</p>
					</div>
				)}

				{/* Previous button */}
				{hasPrev && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={() => {
									setIsLoadingImage(true);
									onPrev();
								}}
								size="icon"
								className="absolute left-2 top-1/2 z-20 -translate-y-1/2"
								aria-label="Previous image"
							>
								<ChevronLeft className="size-8" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">Previous</TooltipContent>
					</Tooltip>
				)}

				{/* Figure with image and caption */}
				<figure className="flex flex-col items-center justify-center">
					{/* Image — always rendered so onLoad fires; hidden via opacity while loading */}
					<img
						src={url}
						srcSet={srcSet}
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
						alt={albumImage.caption || image.altText || "Album photo"}
						className={`max-h-[80vh] max-w-full rounded-lg object-contain transition-opacity duration-300 ${isLoadingImage ? "opacity-0" : "opacity-100"}`}
						onLoad={handleImageLoad}
					/>

					{/* Caption */}
					{!isLoadingImage && albumImage.caption && (
						<figcaption className="py-3 text-center text-sm text-light">
							{albumImage.caption}
						</figcaption>
					)}
				</figure>

				{/* Next button */}
				{hasNext && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								onClick={() => {
									setIsLoadingImage(true);
									onNext();
								}}
								size="icon"
								className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
								aria-label="Next image"
							>
								<ChevronRight className="size-8" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="left">Next</TooltipContent>
					</Tooltip>
				)}
			</div>

			{/* Bottom spacer */}
			<div className="h-4 shrink-0" />
		</LightboxContent>
	);
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function AlbumDetailSkeleton() {
	return (
		<section className="w-full space-y-6">
			{/* Header skeleton */}
			<div className="space-y-3">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-5 w-96" />
				<Skeleton className="h-4 w-32" />
			</div>

			{/* Masonry skeleton */}
			<div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5">
				{Array.from({ length: 12 }).map((_, i) => {
					const key = `detail-skeleton-${i}`;
					return (
						<Skeleton
							key={key}
							className="mb-4 size-full rounded-lg break-inside-avoid"
						/>
					);
				})}
			</div>
		</section>
	);
}

// ============================================================================
// Main Component
// ============================================================================

function AlbumDetailContent({ albumSlug, requiresSub }: AlbumDetailProps) {
	const { session, isPremium, loading: authLoading, mounted } = useSubStatus();
	const checkAuth = requiresSub;

	// Lightbox state
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	// Fetch album with all images by slug
	const {
		data: album,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["cfImages", "albums", "getAlbum", albumSlug],
		queryFn: async () => {
			const client = trpcClient as unknown as GetAlbumClient;
			return client.cfImages.albums.getAlbum.query({
				slug: albumSlug,
			});
		},
		enabled: !!albumSlug,
	});

	// Sort images by sortOrder
	const sortedImages = useMemo(() => {
		if (!album?.images) return [];
		return [...album.images].sort((a, b) => a.sortOrder - b.sortOrder);
	}, [album?.images]);

	// Lightbox handlers
	const openLightbox = (index: number) => setLightboxIndex(index);
	const closeLightbox = () => setLightboxIndex(null);
	const prevImage = () =>
		setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
	const nextImage = () =>
		setLightboxIndex((prev) =>
			prev !== null && prev < sortedImages.length - 1 ? prev + 1 : prev,
		);

	// Auth loading state
	if (checkAuth && (!mounted || authLoading)) {
		return <AlbumDetailSkeleton />;
	}

	// Subscription gate
	if (checkAuth && (!session?.user || !isPremium)) {
		return <Pricing />;
	}

	// Loading state
	if (isLoading) {
		return <AlbumDetailSkeleton />;
	}

	// Error state
	if (error) {
		const isNotFound =
			error.message?.includes("NOT_FOUND") ||
			error.message?.includes("not found");

		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-12 text-center">
				<ImageIcon className="mb-4 size-16 text-muted-foreground" />
				<p className="text-lg font-semibold">
					{isNotFound ? "Album not found" : "Failed to load album"}
				</p>
				<p className="mt-2 text-sm text-muted-foreground">
					{isNotFound
						? "The album you're looking for doesn't exist or has been removed."
						: error.message ||
							"An unexpected error occurred. Please try again later."}
				</p>
				<a href="/photos">
					<Button variant="outline" className="mt-6">
						<ArrowLeft className="mr-2 size-4" />
						Back to Albums
					</Button>
				</a>
			</div>
		);
	}

	// Album not found (no error but no data)
	if (!album) {
		return (
			<div className="mx-auto flex w-full max-w-md flex-col items-center justify-center p-12 text-center">
				<ImageIcon className="mb-4 size-16 text-muted-foreground" />
				<p className="text-lg font-semibold">Album not found</p>
				<a href="/photos">
					<Button variant="outline" className="mt-6">
						<ArrowLeft className="mr-2 size-4" />
						Back to Albums
					</Button>
				</a>
			</div>
		);
	}

	return (
		<section className="w-full space-y-6">
			{/* Album Header */}
			<div className="space-y-3">
				<a
					href="/photos"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Back to Albums
				</a>

				<h1 className="text-3xl font-bold">{album.title}</h1>

				{album.description && (
					<p className="max-w-2xl text-muted-foreground">{album.description}</p>
				)}

				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<Images className="size-4" />
					<span>
						{album.imageCount} {album.imageCount === 1 ? "photo" : "photos"}
					</span>
				</div>
			</div>

			{/* Image Masonry */}
			{sortedImages.length > 0 ? (
				<div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5">
					{sortedImages.map((albumImage, index) => (
						<div key={albumImage.id} className="mb-4 break-inside-avoid">
							<AlbumImageCard
								albumImage={albumImage}
								onClick={() => openLightbox(index)}
							/>
						</div>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Images className="mb-4 size-16 text-muted-foreground" />
					<p className="text-lg font-semibold">No photos in this album</p>
					<p className="mt-2 text-sm text-muted-foreground">
						Photos will appear here once they're added.
					</p>
				</div>
			)}

			{/* Lightbox */}
			<Lightbox
				open={lightboxIndex !== null && !!sortedImages[lightboxIndex ?? -1]}
				onOpenChange={(open) => {
					if (!open) closeLightbox();
				}}
			>
				{lightboxIndex !== null && sortedImages[lightboxIndex] && (
					<ImageLightbox
						albumImage={sortedImages[lightboxIndex]}
						onPrev={prevImage}
						onNext={nextImage}
						hasPrev={lightboxIndex > 0}
						hasNext={lightboxIndex < sortedImages.length - 1}
						currentIndex={lightboxIndex}
						totalImages={sortedImages.length}
					/>
				)}
			</Lightbox>
		</section>
	);
}

// ============================================================================
// Exported Component with QueryProvider
// ============================================================================

/**
 * AlbumDetail with QueryProvider wrapper
 *
 * @example
 * ```astro
 * <AlbumDetail client:load albumSlug={albumSlug} requiresSub={true} />
 * ```
 */
export function AlbumDetail(props: AlbumDetailProps) {
	return (
		<QueryProvider>
			<AlbumDetailContent {...props} />
		</QueryProvider>
	);
}

export default AlbumDetail;
