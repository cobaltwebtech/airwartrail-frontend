import { useSubStatus } from "@/lib/useSubStatus";
import { useVideoToken } from "@/lib/useVideoToken";
import { Loader2 } from "lucide-react";

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
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if ((!isPremium || !session?.user) && tokenQuery) {
    const fullUrl = `${videoUrl}${tokenQuery}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

    return (
      <>
        <p>
          If you are not currently subscribed to our Premium Plan, please{" "}
          <a href="/subscribe">subscribe now</a> to view the full length video
          or you can watch the short clip below.
        </p>
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
      </>
    );
  }
}
