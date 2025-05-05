import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface VideoEmbedProps {
  videoUrl: string;
}

function extractVideoId(url: string): string | null {
  // Inspect and extract the paramters from the embed URL
  const match = url.match(/\/embed\/[^/]+\/([^?]+)/);
  return match ? match[1] : null;
}

export function VideoEmbed({ videoUrl }: VideoEmbedProps) {
  const [mounted, setMounted] = useState(false);
  const [tokenQuery, setTokenQuery] = useState<string | null>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (videoUrl) {
      const videoId = extractVideoId(videoUrl);
      if (!videoId) return;
      fetch(`/api/bunny/videoToken?videoId=${videoId}`)
        .then((res) => res.json() as Promise<{ url: string }>)
        .then((data) => setTokenQuery(data.url))
        .catch((err) => {
          console.error("Failed to fetch video token", err);
          setTokenQuery(null);
        });
    }
  }, [videoUrl]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (tokenQuery) {
    const signedUrl = `${videoUrl}${tokenQuery}&autoplay=true&loop=true&muted=true&preload=true&responsive=true`;

    return (
      <div className="relative pt-[56.25%]">
        <iframe
          src={signedUrl}
          loading="eager"
          className="absolute top-0 h-full w-full rounded-lg border-0"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen={true}
        ></iframe>
      </div>
    );
  }
}
