import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useVideoToken } from "@/lib/useVideoToken";

interface VideoEmbedProps {
	videoUrl: string;
}

export function VideoEmbed({ videoUrl }: VideoEmbedProps) {
	const { tokenQuery } = useVideoToken(videoUrl);
	const [mounted, setMounted] = useState(false);

	// Handle hydration
	useEffect(() => {
		setMounted(true);
	}, []);

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
