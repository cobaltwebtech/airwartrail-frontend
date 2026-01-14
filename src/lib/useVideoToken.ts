import { useEffect, useState } from "react";

export function useVideoToken(videoUrl: string | undefined) {
	const [tokenQuery, setTokenQuery] = useState<string | null>(null);

	useEffect(() => {
		if (!videoUrl) return;

		// Extract videoId from the embed URL
		const videoIdMatch = videoUrl.match(/\/embed\/[^/]+\/([^?]+)/);
		const videoId = videoIdMatch ? videoIdMatch[1] : null;

		if (!videoId) return;

		fetch(`/api/bunny/videoToken?videoId=${videoId}`)
			.then((res) => res.json() as Promise<{ tokenQuery: string }>)
			.then((data) => setTokenQuery(data.tokenQuery))
			.catch((err) => {
				console.error("Failed to fetch video token", err);
				setTokenQuery(null);
			});
	}, [videoUrl]);

	return { tokenQuery };
}
