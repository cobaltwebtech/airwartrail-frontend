/**
 * Type definitions for tRPC API
 * These types mirror the backend API router types
 */

// ============================================================================
// Video Types
// ============================================================================

export interface Video {
	id: string;
	libraryId: string;
	muxAssetId: string;
	muxPlaybackId: string | null;
	muxEnvironmentId: string | null;
	status: VideoStatus;
	errorCategory: string | null;
	errorMessages: string | null;
	title: string;
	description: string | null;
	duration: number;
	aspectRatio: string | null;
	maxWidth: number | null;
	maxHeight: number | null;
	maxStoredFrameRate: number | null;
	resolutionTier: string | null;
	videoQuality: VideoQuality | null;
	playbackId: string | null;
	policy: PlaybackPolicy;
	isPublished: boolean;
	publishedAt: string | null;
	views: number;
	viewCountSyncedAt: string | null;
	customThumbnailUrl: string | null;
	customThumbnailTime: number | null;
	createdAt: string;
	updatedAt: string;
}

export type VideoStatus = "preparing" | "ready" | "errored";
export type PlaybackPolicy = "public" | "signed";
export type VideoQuality = "basic" | "plus" | "premium";

// ============================================================================
// Mux Asset Types
// ============================================================================

export interface MuxAsset {
	id: string;
	playbackId: string;
	status: VideoStatus;
	title: string;
	thumbnail?: string;
	duration: number;
	createdAt: string;
	updatedAt?: string;
	captions?: MuxTrack[];
	metadata?: Record<string, unknown>;
	policy?: PlaybackPolicy;
	resolutionTier?: "audio-only" | "720p" | "1080p" | "1440p" | "2160p";
	aspectRatio?: string;
	videoQuality?: VideoQuality;
	maxStoredFrameRate?: number;
	maxWidth?: number;
	maxHeight?: number;
	views?: number;
	isPublished?: boolean;
}

export interface MuxTrack {
	id: string;
	type: "text" | "audio" | "video";
	textType?: "captions" | "subtitles";
	language?: string;
	languageCode?: string;
	name?: string;
	closed_captions?: boolean;
}

// ============================================================================
// Library Types
// ============================================================================

export interface Library {
	id: string;
	name: string;
	description: string | null;
	muxEnvironmentId: string | null;
	tokenId: string;
	signingKeyId: string | null;
	webhookSecret: string | null;
	defaultPlaybackPolicy: PlaybackPolicy;
	defaultVideoQuality: VideoQuality;
	isDefault: boolean;
	isActive: boolean;
	hasSigningKey: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Playlist Types
// ============================================================================

export interface Playlist {
	id: string;
	libraryId: string;
	name: string;
	slug: string;
	description: string | null;
	category: PlaylistCategory;
	thumbnailVideoId: string | null;
	thumbnailTime: number | null;
	thumbnailPlaybackId: string | null;
	thumbnailPolicy: PlaybackPolicy | null;
	isPublished: boolean;
	publishedAt: Date | null;
	sortOrder: number;
	tags: string[];
	customMetadata: Record<string, unknown> | null;
	videoCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export type PlaylistCategory =
	| "featured"
	| "interviews"
	| "series"
	| "short-form"
	| "other";

export interface PlaylistVideo {
	id: string;
	playlistId: string;
	videoId: string;
	sortOrder: number;
	customTitle: string | null;
	customDescription: string | null;
	addedAt: Date | string; // Date when video was added to playlist
	// Joined video data
	title: string;
	description: string | null;
	muxPlaybackId: string | null;
	playbackPolicy: PlaybackPolicy | null;
	duration: number | null;
	status: string;
	isPublished: boolean;
	createdAt: Date | string; // Date when video was uploaded to library
}

// ============================================================================
// Chapter Types
// ============================================================================

export interface Chapter {
	id: string;
	videoId: string;
	title: string;
	startTime: number;
	endTime: number | null;
	sortOrder: number;
	thumbnailTime: number | null;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface VideoTag {
	id: string;
	slug: string;
	name: string;
	description?: string;
	isActive: boolean;
	createdAt: number;
}

export interface VideoTagAssignment {
	id: string;
	videoId: string;
	tagId: string;
	assignedAt: number;
}

export interface VideoTagDetail {
	id: string;
	slug: string;
	name: string;
	description?: string;
}

export interface TagStatistic {
	tagId: string;
	tagSlug: string;
	tagName: string;
	videoCount: number;
}

// ============================================================================
// Blog Post Types
// ============================================================================

export type PublishStatus = "draft" | "published" | "scheduled" | "archived";

export interface Post {
	id: string;
	slug: string;
	title: string;
	shortDescription: string | null;
	postContent: unknown;
	featuredImageUrl: string | null;
	featuredImageAlt: string | null;
	publishStatus: PublishStatus;
	publishedAt: string | null;
	author: string;
	authorId: string | null;
	isFeatured: boolean;
	readingTimeMinutes: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface GetPostInput {
	id?: string;
	slug?: string;
}

export interface ListPostsInput {
	limit?: number;
	page?: number;
	status?: PublishStatus;
	search?: string;
	sortBy?: "createdAt" | "updatedAt" | "publishedAt" | "title";
	sortOrder?: "asc" | "desc";
	featuredOnly?: boolean;
}

export interface ListPostsPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface ListPostsOutput {
	blogPosts: Post[];
	pagination: ListPostsPagination;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface DirectUpload {
	id: string;
	url: string;
	status: UploadStatus;
	timeout: number;
	assetId?: string;
}

export type UploadStatus =
	| "waiting"
	| "asset_created"
	| "errored"
	| "cancelled"
	| "timed_out";

// ============================================================================
// Cloudflare Images Types
// ============================================================================

export interface Image {
	id: string; // Internal DB ID (project-level)
	cfImageId: string; // Cloudflare Images ID
	deliveryUrl: string; // Base delivery URL (imagedelivery.net or custom domain)
	fileName: string | null; // Original filename
	altText: string | null; // Accessibility alt text
	width: number | null; // Image width in pixels
	height: number | null; // Image height in pixels
	requireSignedURLs: boolean; // Whether signed URLs are required
	metadata: Record<string, unknown> | null; // Custom metadata
	createdAt: Date; // Upload timestamp
}

export interface Album {
	id: string;
	slug: string; // URL-friendly identifier
	title: string;
	description: string | null;
	publishStatus: "draft" | "published" | "archived";
	coverImageId: string | null; // References an image
	coverImage: Image | null; // Cover image object (when fetched with relations)
	authorId: string | null;
	imageCount: number; // Number of images in album
	createdAt: Date;
	updatedAt: Date;
}

export interface AlbumImage {
	id: string;
	albumId: string;
	imageId: string;
	image: Image; // Full image object
	caption: string | null; // Album-specific caption
	sortOrder: number; // Position in album
	createdAt: Date;
}

// ============================================================================
// Cloudflare Images Input Types
// ============================================================================

export interface ListImagesInput {
	limit?: number; // 1-100, default: 50
	page?: number; // default: 1
	sortOrder?: "asc" | "desc"; // default: 'desc'
}

export interface GetImageInput {
	id: string; // Internal image ID
}

export interface GetImageByCfIdInput {
	cfImageId: string; // Cloudflare Images ID
}

export interface ListImagesOutput {
	images: Image[];
	pagination: PaginationMeta;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

// ============================================================================
// Album Input Types
// ============================================================================

export interface GetAlbumInput {
	id?: string; // Album ID
	slug?: string; // Album slug (URL-friendly)
	// Must provide either id OR slug
}

export interface ListAlbumsInput {
	limit?: number; // 1-100, default: 25
	page?: number; // default: 1
	status?: "draft" | "published" | "archived"; // Filter by status
	sortBy?: "createdAt" | "updatedAt" | "title"; // default: 'createdAt'
	sortOrder?: "asc" | "desc"; // default: 'desc'
}

export interface ListAlbumsOutput {
	albums: (Album & { coverImage: Image | null })[];
	pagination: PaginationMeta;
}

export interface GetAlbumOutput extends Album {
	images: AlbumImage[];
}

// ============================================================================
// Signed URLs Input/Output Types
// ============================================================================

export interface SignUrlInput {
	imageId: string; // Internal image ID
	variant?: string; // Named variant, default: 'public'
	expirationSeconds?: number; // 60-86400 (1 min - 24 hrs), default: 3600
}

export interface SignUrlOutput {
	imageId: string;
	variant: string;
	url: string; // Signed or plain URL depending on requireSignedURLs
	signed: boolean; // true if image requires signatures
}

export interface SignVariantsInput {
	imageId: string; // Internal image ID
	variants: string[]; // Array of variant names (max 20)
	expirationSeconds?: number; // 60-86400, default: 3600
}

export interface SignVariantsOutput {
	imageId: string;
	signed: boolean;
	variants: {
		variant: string;
		url: string;
	}[];
}

export interface SignBatchInput {
	imageIds: string[]; // Array of internal image IDs (max 100)
	variant?: string; // Single variant for all, default: 'public'
	expirationSeconds?: number; // 60-86400, default: 3600
}

export interface SignBatchOutput {
	images: {
		imageId: string;
		variant: string;
		url: string;
		signed: boolean;
	}[];
	notFound: string[]; // IDs that weren't found
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKey {
	id: string;
	name: string;
	start: string;
	prefix: string;
	enabled: boolean;
	expiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	lastRequest: Date | null;
	requestCount: number;
	rateLimitEnabled: boolean;
	rateLimitMax: number | null;
	rateLimitTimeWindow: number | null;
	permissions: Permissions | null;
	metadata: Record<string, unknown> | null;
}

export type Permissions = {
	mux?: ("read" | "write" | "delete")[];
	playlists?: ("read" | "write" | "delete")[];
	libraries?: ("read" | "write")[];
};

// ============================================================================
// Signed Token Types
// ============================================================================

export interface SignedTokens {
	playback: string;
	thumbnail: string;
	storyboard: string;
}

// ============================================================================
// API Router Type
// ============================================================================

/**
 * AppRouter type definition for the CMS Worker API.
 *
 * Since the CMS is a separate repo/worker, we define the router type manually.
 * Keep this in sync with the actual procedures in airwartrail-cms.
 *
 * For a shared types approach, consider publishing @airwartrail/api-types as an npm package.
 */

// Input/Output types for procedures
export interface ListVideosInput {
	libraryId: string;
	limit?: number;
	offset?: number;
	status?: VideoStatus;
	isPublished?: boolean;
}

export interface GetVideoByIdInput {
	videoId: string;
	libraryId: string;
}

export interface GenerateSignedTokensInput {
	playbackId: string;
	libraryId: string;
}

export interface ListPlaylistsInput {
	libraryId: string;
	limit?: number;
	offset?: number;
	isPublished?: boolean;
}

export interface GetPlaylistInput {
	playlistId: string;
	libraryId: string;
}

export interface GetPlaylistBySlugInput {
	slug: string;
	libraryId: string;
}

// Tag Management Inputs
export interface CreateTagInput {
	name: string;
	description?: string;
}

export interface UpdateTagInput {
	tagId: string;
	name?: string;
	description?: string | null;
	isActive?: boolean;
}

export interface DeleteTagInput {
	tagId: string;
}

export interface GetTagStatisticsInput {
	libraryId?: string;
}

export interface SetVideoTagsInput {
	videoId: string;
	libraryId: string;
	tagIds: string[];
}

export interface GetVideoTagsInput {
	videoId: string;
	libraryId: string;
}

export interface SearchVideosByTagsInput {
	libraryId: string;
	tagIds: string[];
	matchMode?: "any" | "all";
	limit?: number;
	offset?: number;
}

/** Response type for searchVideosByTags API */
export interface SearchVideoResult {
	id: string;
	title: string;
	description?: string;
	muxPlaybackId: string | null;
	playbackPolicy: PlaybackPolicy;
	duration: number;
	createdAt: string;
	tagCount?: number;
	views?: number;
	isPublished?: boolean;
	status?: string;
}

// ============================================================================
// AppRouter Type
// ============================================================================

import type { AnyRouter } from "@trpc/server";

/**
 * AppRouter type for the CMS Worker API.
 *
 * Uses AnyRouter as the base type which satisfies tRPC client constraints.
 * The input/output types defined above provide type safety when used
 * explicitly in components.
 *
 * Usage with type safety:
 * ```typescript
 * const videos = await trpc.mux.listVideosFromDatabase.query({
 *   libraryId: 'xxx',
 *   limit: 20,
 * } satisfies ListVideosInput) as Video[];
 * ```
 *
 * For full end-to-end type inference, consider:
 * 1. Publishing @airwartrail/api-types as a shared npm package
 * 2. Using a monorepo structure
 */
export type AppRouter = AnyRouter;
