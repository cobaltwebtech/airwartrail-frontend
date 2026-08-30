Here's a markdown summary you can hand to the other agent. It covers the worker (backend) changes, the tRPC client transport config (including the Cloudflare Service Binding fetch), and the React frontend patterns, based on the implementation in this repo.

---

# Update guide: tRPC / API changes for the Astro video app

## 1. Backend (Worker) — what the API now accepts

These changes are already live in the worker; the Astro app just needs to call them correctly.

### a. Batch procedures now accept up to 100 items

- `mux.getThumbnailBatch` input: `videoIds: z.array(z.string()).max(100)`
- `mux.generateSignedTokensBatch` input: `items: z.array({...}).max(100)`

> Client-side, chunk your requests to **≤50 items each** (see §3). This keeps you comfortably under the server limit and the 8KB URL limit.

### b. `mux.listVideosFromDatabase` now supports a `cursor` for pagination

```
input: { libraryId, limit?, offset?, cursor?, includeTags? }
```

- `limit`: `1..100`, default `50`
- `cursor`: optional `number` (0+), used as the SQL offset. **takes precedence over `offset`**.
- When tRPC's `infiniteQueryOptions` is used, `cursor` is appended to the input automatically per page fetch.

There is **no response-shape change** — each page returns the same `Video` array.

---

## 2. tRPC client — transport (the critical fix)

### The 431 root cause and the fix

tRPC's `httpBatchLink` sends **queries as GET requests** with the entire serialized input in the URL (`?batch=1&input=...`). When many queries fire together (e.g. a virtualized list mounting dozens of `VideoThumbnail` components), tRPC batches them into **one URL** which can exceed Cloudflare's **~8KB URL limit → HTTP 431**.

**Fix: send the heavy procedures over POST** so the input goes in the request body, not the URL.

### Service Binding note

With a Cloudflare Service Binding the request stays internal (doesn't cross the edge proxy), but the Workers runtime still imposes URL-size limits, so the POST approach is still the correct, robust choice.

### Recommended client config (Astro / React)

```ts
import { createTRPCClient, httpBatchLink, splitLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

// Procedures that can carry large payloads -> force POST (input in body).
const POST_ONLY_PATHS = new Set([
  'mux.getThumbnailBatch',
  'mux.generateSignedTokensBatch',
  'mux.generateSignedTokens',
]);

// fetch that routes through your Service Binding.
const bindingFetch = (url: RequestInfo | URL, options?: RequestInit) =>
  env.VIDEO_BINDING.fetch(url, options); // your binding name

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => POST_ONLY_PATHS.has(op.path),
      true: httpBatchLink({
        url: 'http://video-worker/trpc', // arbitrary hostname (binding fetch ignores it)
        transformer: superjson,
        methodOverride: 'POST',
        fetch: bindingFetch,
      }),
      false: httpBatchLink({
        url: 'http://video-worker/trpc',
        transformer: superjson,
        maxURLLength: 6000, // safety net: auto-split any oversized GET batch
        fetch: bindingFetch,
      }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient, // your TanStack QueryClient
});
```

Notes:
- **`superjson` is required** — it must match the server's transformer.
- If your app only calls the mux procedures (no cacheable GET procedures), you can skip `splitLink` and use a single `httpBatchLink({ methodOverride: 'POST' })`.
- If you rely on the worker's **edge cache** (`mux.getVideoById`, `mux.getThumbnail`, `mux.getPlaylist`, `mux.listVideosFromDatabase`, `mux.listTags`), those only cache **GET** requests — keep them on the GET link (the `false` branch above). The batch procedures are not cacheable.

---

## 3. Frontend (React) — data patterns

### a. Use the batch procedures, chunked to ≤50, with `useQueries`

```ts
const BATCH_CHUNK_SIZE = 50;
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Thumbnails
const { data: thumbnailBatch, isLoading: isThumbnailBatchLoading } = useQueries({
  queries: chunkArray(videoIds, BATCH_CHUNK_SIZE).map((chunk) =>
    trpc.mux.getThumbnailBatch.queryOptions({ videoIds: chunk, libraryId }),
  ),
  combine: (results) => ({
    data: results.flatMap((r) => r.data ?? []),
    isLoading: results.some((r) => r.isLoading),
  }),
});

// Signed tokens (only for videos with a playbackId)
const { data: signedTokensBatch, isLoading: isSignedTokensBatchLoading } = useQueries({
  queries: chunkArray(playbackItems, BATCH_CHUNK_SIZE).map((chunk) =>
    trpc.mux.generateSignedTokensBatch.queryOptions({ items: chunk, libraryId }),
  ),
  combine: (results) => ({
    data: results.flatMap((r) => r.data ?? []),
    isLoading: results.some((r) => r.isLoading),
  }),
});
```

- Build lookup maps for `O(1)` access: `Map(videoId -> thumbnail)`, `Map(playbackId -> tokens)`.
- **Pass the loading flags into your thumbnail component** and gate the *individual* `getThumbnail` / `generateSignedTokens` fallback queries on `!batchPending`. This prevents dozens of duplicate one-off queries from firing while the batch loads (the original cause of the URL bloat):

```ts
// Inside VideoThumbnail
const { data } = useQuery(
  trpc.mux.getThumbnail.queryOptions(
    { videoId, libraryId },
    { enabled: !!videoId && !!libraryId && !batchThumbnailData && !batchThumbnailPending },
  ),
);
```

### b. Infinite scroll with `useInfiniteQuery`

TanStack Virtual only virtualizes the DOM — it never fetches. Wire pagination on top:

```ts
const PAGE_SIZE = 50;
function videoPageOptions(libraryId: string) {
  return trpc.mux.listVideosFromDatabase.infiniteQueryOptions(
    { libraryId, limit: PAGE_SIZE },
    {
      initialCursor: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < PAGE_SIZE) return undefined;
        return allPages.reduce((sum, page) => sum + page.length, 0);
      },
    },
  );
}

const {
  data: videosData,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  ...videoPageOptions(libraryId),
  enabled: !!libraryId,
});

const videos = videosData?.pages.flat() ?? [];
```

- Feed the **flattened** `videos` array to the existing virtualizer — no change needed to the virtualizer itself.
- Trigger the next page with a sentinel element + `IntersectionObserver` at the end of the list:

```ts
useEffect(() => {
  const el = endSentinelRef.current;
  if (!el || !hasNextPage || !fetchNextPage) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    },
    { rootMargin: '400px 0px' },
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [hasNextPage, fetchNextPage, isFetchingNextPage]);
```

```tsx
{hasNextPage && (
  <div ref={endSentinelRef} className="flex justify-center py-4">
    {isFetchingNextPage && <Spinner />}
  </div>
)}
```

### c. Batch queries with the infinite list

Keep the batch thumbnail/token queries fed from the **accumulated** videos. Because React Query caches by input, when sorting by the default `createdAt DESC`, the leading chunks are cache hits and only the new slice fetches per page. Under custom sorts (title/scheduled), chunks re-fetch — still correct and bounded.

---

## 4. Query invalidation — use path-prefix keys

`infiniteQueryOptions` keys vary by page cursor, so invalidating by exact input won't hit them. Use the path-prefix key so all pages refresh:

```ts
queryClient.invalidateQueries({ queryKey: [['mux', 'listVideosFromDatabase']] });
```

Do this after uploads/sync/delete — same as the CMS does.

---

## 5. Checklist for the Astro app

- [ ] Client uses `superjson` transformer (required, matches server).
- [ ] Heavy procedures (`getThumbnailBatch`, `generateSignedTokensBatch`, `generateSignedTokens`) go over POST (`methodOverride: 'POST'`), via a custom `fetch` that calls the Service Binding.
- [ ] GET link (cacheable procedures) has `maxURLLength: 6000` fallback.
- [ ] Batch requests chunked to ≤50 items.
- [ ] `VideoThumbnail` suppresses individual queries while a batch is pending (loading flags).
- [ ] Video list uses `useInfiniteQuery` with `infiniteQueryOptions` + sentinel/`IntersectionObserver`; virtualizer untouched.
- [ ] Invalidate with prefix key `[['mux','listVideosFromDatabase']]`.

**No backend worker changes are needed** — everything above is client-side. If you also want `listVideosFromDatabase` to support keyset (cursor-by-timestamp) pagination instead of offset, that's an optional worker change; not required given the low update frequency.