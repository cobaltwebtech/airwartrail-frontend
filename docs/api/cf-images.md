Collecting workspace information# Cloudflare Images API - Frontend Documentation

> **For Claude Opus Context**: This document contains all necessary information for implementing a read-only Astro/React frontend that fetches and displays images and albums from the AirWarTrail CMS backend API.

---

## Quick Start

### Base API Endpoint
```
/trpc/cfImages
```

All requests go through the tRPC client configured in trpc.ts.

### Authentication
- **Session Cookie**: Automatically included in browser requests (credentials: 'include')
- **API Key** (server-side): Use `x-api-key` header with format `awt_xxx`

---

## Type Definitions

### Image

```typescript
interface Image {
  id: string;                    // Internal DB ID (project-level)
  cfImageId: string;             // Cloudflare Images ID
  deliveryUrl: string;           // Base delivery URL (imagedelivery.net or custom domain)
  fileName: string | null;       // Original filename
  altText: string | null;        // Accessibility alt text
  width: number | null;          // Image width in pixels
  height: number | null;         // Image height in pixels
  requireSignedURLs: boolean;     // Whether signed URLs are required
  metadata: Record<string, unknown> | null; // Custom metadata
  createdAt: Date;               // Upload timestamp
}
```

### Album

```typescript
interface Album {
  id: string;
  slug: string;                  // URL-friendly identifier
  title: string;
  description: string | null;
  publishStatus: 'draft' | 'published' | 'archived';
  coverImageId: string | null;   // References an image
  coverImage: Image | null;      // Cover image object (when fetched with relations)
  authorId: string | null;
  imageCount: number;            // Number of images in album
  createdAt: Date;
  updatedAt: Date;
}
```

### AlbumImage (Junction Record)

```typescript
interface AlbumImage {
  id: string;
  albumId: string;
  imageId: string;
  image: Image;                  // Full image object
  caption: string | null;        // Album-specific caption
  sortOrder: number;             // Position in album
  createdAt: Date;
}
```

---

## API Procedures - Read Operations

### Images Router - `trpc.cfImages.images.*`

#### `listImages`

Fetch paginated list of images from the database.

**Input:**
```typescript
{
  limit?: number;       // 1-100, default: 50
  page?: number;        // default: 1
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
}
```

**Output:**
```typescript
{
  images: Image[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

**Example:**
```tsx
const { data: result } = useQuery(
  trpc.cfImages.images.listImages.queryOptions({
    limit: 25,
    page: 1,
    sortOrder: 'desc',
  })
);
```

---

#### `getImage`

Fetch a single image by internal ID.

**Input:**
```typescript
{
  id: string;  // Internal image ID
}
```

**Output:** `Image`

**Example:**
```tsx
const { data: image } = useQuery(
  trpc.cfImages.images.getImage.queryOptions({
    id: 'image_abc123',
  })
);
```

---

#### `getImageByCfId`

Fetch a single image by Cloudflare Images ID.

**Input:**
```typescript
{
  cfImageId: string;  // Cloudflare Images ID
}
```

**Output:** `Image`

**Example:**
```tsx
const { data: image } = useQuery(
  trpc.cfImages.images.getImageByCfId.queryOptions({
    cfImageId: 'cf_image_xyz789',
  })
);
```

---

#### `getDownloadUrl`

Generate a download URL for the original image file.

**Input:**
```typescript
{
  id: string;  // Internal image ID
}
```

**Output:**
```typescript
{
  downloadUrl: string;  // URL to download endpoint
  fileName: string | null;
  cfImageId: string;
}
```

**Example:**
```tsx
const { data: downloadInfo } = useQuery(
  trpc.cfImages.images.getDownloadUrl.queryOptions({
    id: 'image_abc123',
  })
);

// Then use downloadInfo.downloadUrl in an <a> tag or fetch
```

---

### Albums Router - `trpc.cfImages.albums.*`

#### `getAlbum`

Fetch a single album with all its images.

**Input:**
```typescript
{
  id?: string;     // Album ID
  slug?: string;   // Album slug (URL-friendly)
}
// Must provide either id OR slug
```

**Output:** `Album` (with `images` array containing full `AlbumImage[]` records)

**Example:**
```tsx
// By ID
const { data: album } = useQuery(
  trpc.cfImages.albums.getAlbum.queryOptions({
    id: 'album_123',
  })
);

// By slug (for URL-based routes)
const { data: album } = useQuery(
  trpc.cfImages.albums.getAlbum.queryOptions({
    slug: 'nature-photography',
  })
);
```

---

#### `listAlbums`

Fetch paginated list of albums with optional filtering.

**Input:**
```typescript
{
  limit?: number;           // 1-100, default: 25
  page?: number;            // default: 1
  status?: 'draft' | 'published' | 'archived'; // Filter by status
  sortBy?: 'createdAt' | 'updatedAt' | 'title'; // default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
}
```

**Output:**
```typescript
{
  albums: (Album & { coverImage: Image | null })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

**Example:**
```tsx
const { data: result } = useQuery(
  trpc.cfImages.albums.listAlbums.queryOptions({
    limit: 12,
    page: 1,
    status: 'published',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
);
```

---

### Signed URLs Router - `trpc.cfImages.signedUrls.*`

#### `signUrl`

Generate a signed URL for a single variant of an image.

**Input:**
```typescript
{
  imageId: string;           // Internal image ID
  variant?: string;          // Named variant, default: 'public'
  expirationSeconds?: number; // 60-86400 (1 min - 24 hrs), default: 3600
}
```

**Output:**
```typescript
{
  imageId: string;
  variant: string;
  url: string;               // Signed or plain URL depending on requireSignedURLs
  signed: boolean;           // true if image requires signatures
}
```

**Example:**
```tsx
const { data: signed } = useQuery(
  trpc.cfImages.signedUrls.signUrl.queryOptions({
    imageId: 'image_abc123',
    variant: 'public',
    expirationSeconds: 3600,
  })
);

// Use signed.url in img src
<img src={signed.url} alt="..." />
```

---

#### `signVariants`

Generate signed URLs for multiple variants (useful for srcset).

**Input:**
```typescript
{
  imageId: string;           // Internal image ID
  variants: string[];        // Array of variant names (max 20)
  expirationSeconds?: number; // 60-86400, default: 3600
}
```

**Output:**
```typescript
{
  imageId: string;
  signed: boolean;
  variants: {
    variant: string;
    url: string;
  }[]
}
```

**Example:**
```tsx
const { data: signed } = useQuery(
  trpc.cfImages.signedUrls.signVariants.queryOptions({
    imageId: 'image_abc123',
    variants: ['thumbnail', 'mobile', 'tablet', 'desktop'],
    expirationSeconds: 7200,
  })
);

// Build srcset
const srcset = signed.variants
  .map(v => `${v.url} ${v.variant}`)
  .join(', ');

<img srcSet={srcset} src={signed.variants[0].url} alt="..." />
```

---

#### `signBatch`

Generate signed URLs for many images at once.

**Input:**
```typescript
{
  imageIds: string[];        // Array of internal image IDs (max 100)
  variant?: string;          // Single variant for all, default: 'public'
  expirationSeconds?: number; // 60-86400, default: 3600
}
```

**Output:**
```typescript
{
  images: {
    imageId: string;
    variant: string;
    url: string;
    signed: boolean;
  }[];
  notFound: string[];        // IDs that weren't found
}
```

**Example:**
```tsx
const { data: batch } = useQuery(
  trpc.cfImages.signedUrls.signBatch.queryOptions({
    imageIds: ['image_1', 'image_2', 'image_3'],
    variant: 'public',
    expirationSeconds: 3600,
  })
);

// Create a map for easy lookup
const urlMap = batch.images.reduce((acc, item) => {
  acc[item.imageId] = item.url;
  return acc;
}, {} as Record<string, string>);
```

---

## URL Generation & Delivery

### Understanding Delivery URLs

Cloudflare Images uses variants to serve optimized versions of images. There are two types of URLs:

#### Public Images

For images where `requireSignedURLs` is `false`:

```
Base: https://imagedelivery.net/<hash>/<image-id>
With variant: https://imagedelivery.net/<hash>/<image-id>/public
With custom domain: https://www.airwartrail.com/cdn-cgi/imagedelivery/<hash>/<image-id>/public
```

**Query Parameters (optional):**
```
?width=640&height=360&quality=80&format=webp
```

**Example:**
```tsx
const imageUrl = `${image.deliveryUrl}/public?width=640&height=360`;
<img src={imageUrl} alt={image.altText} />
```

---

#### Signed Images

For images where `requireSignedURLs` is `true`:

The signature is computed over the CF Images path + query parameters. **Always use the signed URL generated by `trpc.cfImages.signedUrls.signUrl`** - do not try to construct signed URLs manually in the frontend.

```
https://imagedelivery.net/<hash>/<image-id>/public?exp=<unix-timestamp>&sig=<hmac-signature>
```

**Example:**
```tsx
const { data: signed } = useQuery(
  trpc.cfImages.signedUrls.signUrl.queryOptions({
    imageId: image.id,
    variant: 'public',
  })
);

if (!signed) return <Skeleton />;

<img src={signed.url} alt={image.altText} />
```

---

## Common Patterns

### Image Gallery Component

```tsx
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';

export function ImageGallery() {
  const { data: result, isLoading } = useQuery(
    trpc.cfImages.images.listImages.queryOptions({
      limit: 50,
      page: 1,
    })
  );

  if (isLoading) return <div>Loading...</div>;
  if (!result?.images.length) return <div>No images found</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {result.images.map((image) => (
        <ImageCard key={image.id} image={image} />
      ))}
    </div>
  );
}

function ImageCard({ image }: { image: Image }) {
  const { data: signed } = useQuery(
    trpc.cfImages.signedUrls.signUrl.queryOptions({
      imageId: image.id,
      variant: 'public',
    }),
    {
      enabled: image.requireSignedURLs,
      staleTime: 60 * 60 * 1000, // 1 hour
    }
  );

  const url = signed?.url || `${image.deliveryUrl}/public`;

  return (
    <div>
      <img
        src={url}
        alt={image.altText || 'Image'}
        className="w-full h-auto"
      />
      {image.fileName && <p>{image.fileName}</p>}
    </div>
  );
}
```

---

### Album View with Images

```tsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';

export function AlbumPage() {
  const { slug } = useParams({ from: '/_dashboard/albums/$slug' });
  
  const { data: album, isLoading } = useQuery(
    trpc.cfImages.albums.getAlbum.queryOptions({
      slug,
    })
  );

  if (isLoading) return <div>Loading...</div>;
  if (!album) return <div>Album not found</div>;

  return (
    <div>
      <h1>{album.title}</h1>
      {album.description && <p>{album.description}</p>}
      
      <div className="grid grid-cols-4 gap-4 mt-8">
        {album.images.map((albumImage) => (
          <AlbumImageCard key={albumImage.id} albumImage={albumImage} />
        ))}
      </div>
    </div>
  );
}

function AlbumImageCard({ albumImage }: { albumImage: AlbumImage }) {
  const { image } = albumImage;
  
  const { data: signed } = useQuery(
    trpc.cfImages.signedUrls.signUrl.queryOptions({
      imageId: image.id,
      variant: 'public',
    }),
    {
      enabled: image.requireSignedURLs,
      staleTime: 60 * 60 * 1000,
    }
  );

  const url = signed?.url || `${image.deliveryUrl}/public`;

  return (
    <figure>
      <img
        src={url}
        alt={albumImage.caption || image.altText || 'Image'}
        className="w-full h-auto"
      />
      {albumImage.caption && (
        <figcaption className="text-sm text-gray-600 mt-2">
          {albumImage.caption}
        </figcaption>
      )}
    </figure>
  );
}
```

---

### Responsive Image with Srcset

```tsx
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';

export function ResponsiveImage({ image }: { image: Image }) {
  const { data: signed } = useQuery(
    trpc.cfImages.signedUrls.signVariants.queryOptions({
      imageId: image.id,
      variants: ['thumbnail', 'mobile', 'tablet', 'desktop'],
      expirationSeconds: 7200,
    }),
    {
      enabled: image.requireSignedURLs,
      staleTime: 60 * 60 * 1000,
    }
  );

  if (image.requireSignedURLs && !signed) {
    return <div className="bg-gray-200 aspect-video" />;
  }

  const baseUrl = image.requireSignedURLs && signed
    ? signed.variants[0].url
    : `${image.deliveryUrl}/desktop`;

  const srcSet = image.requireSignedURLs && signed
    ? signed.variants
        .map(v => `${v.url} ${v.variant}`)
        .join(', ')
    : [
        `${image.deliveryUrl}/thumbnail 640w`,
        `${image.deliveryUrl}/mobile 768w`,
        `${image.deliveryUrl}/tablet 1024w`,
        `${image.deliveryUrl}/desktop 1280w`,
      ].join(', ');

  return (
    <img
      src={baseUrl}
      srcSet={srcSet}
      alt={image.altText || 'Image'}
      className="w-full h-auto"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 1280px"
    />
  );
}
```

---

### Album Grid with Cover Images

```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';

export function AlbumGrid() {
  const { data: result, isLoading } = useQuery(
    trpc.cfImages.albums.listAlbums.queryOptions({
      limit: 12,
      page: 1,
      status: 'published',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  );

  if (isLoading) return <div>Loading...</div>;
  if (!result?.albums.length) return <div>No albums found</div>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {result.albums.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  );
}

function AlbumCard({ album }: { album: Album & { coverImage: Image | null } }) {
  const { data: signed } = useQuery(
    trpc.cfImages.signedUrls.signUrl.queryOptions({
      imageId: album.coverImage?.id || '',
      variant: 'public',
    }),
    {
      enabled: !!album.coverImage && album.coverImage.requireSignedURLs,
      staleTime: 60 * 60 * 1000,
    }
  );

  const coverUrl = album.coverImage
    ? (signed?.url || `${album.coverImage.deliveryUrl}/public`)
    : null;

  return (
    <Link to="/albums/$slug" params={{ slug: album.slug }}>
      <div className="group cursor-pointer">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={album.title}
            className="w-full aspect-square object-cover rounded-lg group-hover:opacity-75 transition-opacity"
          />
        )}
        <div className="mt-4">
          <h3 className="font-semibold text-lg">{album.title}</h3>
          <p className="text-sm text-gray-600">{album.imageCount} images</p>
        </div>
      </div>
    </Link>
  );
}
```

---

### Image Download Button

```tsx
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function ImageDownloadButton({ imageId }: { imageId: string }) {
  const { data: downloadInfo, isLoading } = useQuery(
    trpc.cfImages.images.getDownloadUrl.queryOptions({
      id: imageId,
    })
  );

  const handleDownload = () => {
    if (!downloadInfo) return;
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = downloadInfo.downloadUrl;
    link.download = downloadInfo.fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading || !downloadInfo}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      <Download size={16} />
      Download
    </button>
  );
}
```

---

## Best Practices

### 1. Token Caching

Signed tokens are cached for 1 hour via TanStack Query. Avoid requesting new tokens for the same image within this window.

```tsx
const { data: signed } = useQuery(
  trpc.cfImages.signedUrls.signUrl.queryOptions({
    imageId: image.id,
    variant: 'public',
  }),
  {
    staleTime: 60 * 60 * 1000, // 1 hour cache
  }
);
```

---

### 2. Lazy Load Signed URLs

Only fetch signed tokens when needed (when image requires it).

```tsx
const { data: signed } = useQuery(
  trpc.cfImages.signedUrls.signUrl.queryOptions({
    imageId: image.id,
    variant: 'public',
  }),
  {
    enabled: image.requireSignedURLs, // Only fetch if needed
  }
);
```

---

### 3. Use Appropriate Variants

Choose variants based on your use case:

- **thumbnail**: Small previews (< 300px)
- **mobile**: Mobile device display (≤ 768px)
- **tablet**: Tablet display (≤ 1024px)
- **desktop**: Full desktop display (≥ 1280px)
- **public**: Default/unoptimized

---

### 4. Handle Missing Images Gracefully

```tsx
const url = image.requireSignedURLs && signed?.url
  ? signed.url
  : `${image.deliveryUrl}/public`;

<img
  src={url}
  alt={image.altText || 'Image'}
  onError={(e) => {
    // Fallback to placeholder
    (e.target as HTMLImageElement).src = '/images/placeholder.png';
  }}
/>
```

---

### 5. Prefetch Gallery Data

Use TanStack Query's prefetching for better UX.

```tsx
const { queryClient } = useRouterContext();

const prefetchNextPage = (nextPage: number) => {
  queryClient.prefetchQuery(
    trpc.cfImages.images.listImages.queryOptions({
      limit: 50,
      page: nextPage,
    })
  );
};
```

---

## Error Handling

### Common Errors

| Status | Code | Meaning | Solution |
|--------|------|---------|----------|
| 401 | `UNAUTHORIZED` | No valid session or API key | Check authentication headers |
| 403 | `FORBIDDEN` | Insufficient permissions | Request read permission |
| 404 | `NOT_FOUND` | Image/album doesn't exist | Verify ID/slug is correct |
| 429 | `TOO_MANY_REQUESTS` | Rate limited | Implement exponential backoff |
| 500 | `INTERNAL_SERVER_ERROR` | Server error | Check Cloudflare status |

---

### Error Response Example

```tsx
const { data, error, isLoading } = useQuery(
  trpc.cfImages.albums.getAlbum.queryOptions({
    slug,
  })
);

if (error) {
  return (
    <div className="text-red-600">
      <p>Error loading album: {error.message}</p>
      {error.data?.code === 'NOT_FOUND' && (
        <p>Album not found. Please check the URL.</p>
      )}
    </div>
  );
}
```

---

## Performance Tips

### 1. Pagination Strategy

Fetch images in batches to avoid loading all at once.

```tsx
const [page, setPage] = useState(1);

const { data, hasNextPage } = useQuery(
  trpc.cfImages.images.listImages.queryOptions({
    limit: 20,
    page,
  })
);

const loadMore = () => {
  if (data?.pagination.totalPages > page) {
    setPage(p => p + 1);
  }
};
```

---

### 2. Use React.memo for Image Components

Prevent unnecessary re-renders.

```tsx
const ImageCard = React.memo(({ image }: { image: Image }) => {
  // Component implementation
});
```

---

### 3. Virtual Scrolling for Large Lists

For galleries with 100+ images, use a virtual scrolling library (e.g., `@tanstack/react-virtual`).

---

### 4. Optimize Images in CI/CD

Store multiple variants in Cloudflare Images for different device sizes to minimize client-side processing.

---

## Related Documentation

- [Cloudflare Images API](https://developers.cloudflare.com/images/)
- tRPC Client Setup
- Authentication
- Best Practices