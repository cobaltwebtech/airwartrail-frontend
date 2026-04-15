import { Film, Star, TvMinimalPlay, UserPlus } from "lucide-react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubStatus } from "@/lib/useSubStatus";

function HomepageHeroContent() {
	const { isPremium, loading } = useSubStatus();

	// Show loading skeleton while auth check completes
	if (loading) {
		return (
			<div className="space-y-4">
				<Skeleton className="mx-auto h-17 w-3/4" />
				<Skeleton className="mx-auto h-12 w-9/10" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<div className="my-8 flex flex-wrap justify-center gap-4">
					<Skeleton className="h-12 w-48" />
					<Skeleton className="h-12 w-48" />
				</div>
			</div>
		);
	}

	return (
		<div>
			{isPremium && (
				<div className="mx-auto w-4/5 flex items-center justify-center gap-2 p-4 bg-accent-6 border border-secondary rounded-lg">
					<Star className="size-8 fill-secondary" />
					<p className="w-fit text-sm text-center">
						Thank you for being a premium member and supporting our mission!
					</p>
					<Star className="size-8 fill-secondary" />
				</div>
			)}
			<h1 className="my-4 text-center text-2xl font-bold sm:text-4xl sm:leading-tight">
				Welcome to the{" "}
				<span className="text-accent-5 text-nowrap">Air War Trail</span>
			</h1>
			<p className="mt-3 text-justify">
				If you walk along the air war trail today, you will see the remains of
				the wartime airfields everywhere you look. The images of war have grown
				faint, but the spirit of the bomber boys over East Anglia will never
				fade.
			</p>
			<p className="mt-3 text-justify">
				They are all gone away now, these once busy and impressive places so
				vital so long ago. Now only the green fields blow in the wind, and the
				sounds of Flying Fortresses and Liberators along the taxiways have been
				silenced forever.
			</p>
			<p className="mt-3 text-justify">
				The Yanks are but memories now. Here and there only solitary walls rest
				on this hallowed ground, standing vigil across the landscape of time.
			</p>

			<div className="my-8 flex w-full flex-row flex-wrap justify-center items-center gap-4">
				{isPremium ? (
					<>
						<a href="/streaming/premium">
							<Button size="lg" className="text-lg font-semibold">
								<TvMinimalPlay className="size-6" />
								View Premium Content
							</Button>
						</a>
						<a href="/playlists">
							<Button
								variant="reversed"
								size="lg"
								className="text-lg font-semibold"
							>
								<Film className="size-6" />
								View Playlists
							</Button>
						</a>
					</>
				) : (
					<>
						<a href="/subscribe">
							<Button size="lg" className="text-lg font-semibold">
								<UserPlus className="size-6" />
								Subscribe Now
							</Button>
						</a>
						<a href="/streaming/basic">
							<Button
								variant="reversed"
								size="lg"
								className="text-lg font-semibold"
							>
								<TvMinimalPlay className="size-6" />
								View Free Content
							</Button>
						</a>
					</>
				)}
			</div>
		</div>
	);
}

export function HomepageHero() {
	return (
		<QueryProvider>
			<HomepageHeroContent />
		</QueryProvider>
	);
}

export default HomepageHero;
