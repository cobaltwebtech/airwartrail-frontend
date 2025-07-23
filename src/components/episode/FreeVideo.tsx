import { useSubStatus } from "@/lib/useSubStatus";
import { useVideoToken } from "@/lib/useVideoToken";
import { Loader2, CircleX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FreeVideoProps {
  videoUrl: string;
  videoTitle?: string;
}

export function FreeVideo({ videoUrl, videoTitle }: FreeVideoProps) {
  // Use the React hooks for checking subscription status and generating secure token on video
  const { session, isPremium, loading, mounted } = useSubStatus();
  const { tokenQuery } = useVideoToken(videoUrl);

  if (loading) {
    return (
      <Skeleton className="flex aspect-video items-center justify-center">
        <Loader2 className="size-12 animate-spin" />
      </Skeleton>
    );
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center text-red-500">
        <CircleX className="size-12" />
        <p className="text-lg font-semibold">
          Error loading video. Please refresh page.
        </p>
      </div>
    );
  }

  if ((!isPremium || !session?.user) && tokenQuery) {
    const fullUrl = `${videoUrl}${tokenQuery}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

    return (
      <>
        {videoTitle && <h4>{videoTitle}</h4>}
        <div className="relative pt-[56.25%]">
          <iframe
            src={fullUrl}
            loading="eager"
            className="absolute top-0 aspect-video w-full rounded-lg border-0"
            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
            allowFullScreen={true}
          ></iframe>
        </div>
        <p>
          Want to see the full-length film? Subscribe to our Premium Plan for
          exclusive documentaries, rare interviews, and extraordinary bonus
          content—plus, your membership helps us preserve history.{" "}
          <a href="/subscribe">Subscribe Now!</a>
        </p>
      </>
    );
  }
}
