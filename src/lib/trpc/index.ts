/**
 * tRPC Client Exports
 *
 * Server-side usage (Astro pages, API routes):
 * ```typescript
 * import { createServerTRPCClient, createApiKeyTRPCClient } from '../lib/trpc';
 * ```
 *
 * Client-side usage (React components):
 * ```typescript
 * import { trpc, queryClient, trpcClient } from '../lib/trpc';
 * ```
 */

// Client-side clients (HTTP via proxy)
export { queryClient, trpc, trpcClient } from "./client";
// Server-side clients (Service Bindings)
export { createApiKeyTRPCClient, createServerTRPCClient } from "./server";

// Types
export type {
	ApiKey,
	AppRouter,
	Chapter,
	CreateTagInput,
	DeleteTagInput,
	DirectUpload,
	GetTagStatisticsInput,
	GetVideoTagsInput,
	Library,
	MuxAsset,
	MuxTrack,
	Permissions,
	PlaybackPolicy,
	Playlist,
	PlaylistCategory,
	PlaylistVideo,
	SearchVideoResult,
	SearchVideosByTagsInput,
	SetVideoTagsInput,
	SignedTokens,
	TagStatistic,
	UpdateTagInput,
	UploadStatus,
	Video,
	VideoQuality,
	VideoStatus,
	VideoTag,
	VideoTagAssignment,
	VideoTagDetail,
} from "./types";
