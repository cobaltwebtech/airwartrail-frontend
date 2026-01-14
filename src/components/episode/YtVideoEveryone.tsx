import { Loader2, CircleX } from "lucide-react";

interface YtVideoEveryoneProps {
	ytShareUrl: string;
	videoTitle?: string;
}

export function YtVideoEveryone({
	ytShareUrl,
	videoTitle,
}: YtVideoEveryoneProps) {
	// Extract YouTube video ID from various possible URL formats
	const extractYouTubeId = (url: string): string => {
		// Handle youtu.be short links
		if (url.includes("youtu.be/")) {
			const id = url.split("youtu.be/")[1]?.split(/[?&#]/)[0];
			return id || "";
		}

		// Handle youtube.com links with v parameter
		const match = url.match(
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
		);
		return match ? match[1] : "";
	};

	const videoId = extractYouTubeId(ytShareUrl);

	// If we can't extract a valid video ID, show an error
	if (!videoId) {
		return (
			<div className="flex flex-col items-center text-red-500">
				<CircleX className="size-12" />
				<p className="text-lg font-semibold">Invalid YouTube URL provided.</p>
			</div>
		);
	}

	const ytEmbedUrl = `https://www.youtube.com/embed/${videoId}`;

	return (
		<>
			{videoTitle && <h4>{videoTitle}</h4>}
			<div className="relative pt-[56.25%]">
				<iframe
					src={ytEmbedUrl}
					loading="eager"
					className="absolute top-0 aspect-video w-full rounded-lg border-0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;"
					allowFullScreen={true}
				></iframe>
			</div>
		</>
	);
}
