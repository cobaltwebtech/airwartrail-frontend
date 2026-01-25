import useEmblaCarousel from "embla-carousel-react";
import { CircleArrowLeft, CircleArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface SlideProps {
	id?: string;
	title?: string;
	description?: string;
	image: string;
	alt: string;
}

interface SlideShowProps {
	slides: SlideProps[];
	delay?: number;
}

export function SlideShow({ slides, delay = 4500 }: SlideShowProps) {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		loop: true,
		dragFree: true,
	});
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Autoplay effect
	useEffect(() => {
		if (!emblaApi) return;

		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		intervalRef.current = setInterval(() => {
			emblaApi.goToNext();
		}, delay);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [emblaApi, delay]);

	const goToPrev = () => {
		emblaApi?.goToPrev();
	};

	const goToNext = () => {
		emblaApi?.goToNext();
	};

	return (
		<div className="mx-auto my-8 max-w-3xl embla-carousel">
			<div className="embla-viewport" ref={emblaRef}>
				<div className="embla-container">
					{slides.map((slide, index) => (
						<div key={slide.id || index} className="embla-slide">
							<img
								src={slide.image}
								className="embla-slide-img"
								alt={slide.alt}
							/>
						</div>
					))}
				</div>
			</div>
			<div className="embla-controls">
				<div className="embla-buttons">
					<Button variant="reversed" size="icon" onClick={goToPrev}>
						<CircleArrowLeft />
					</Button>
					<Button variant="reversed" size="icon" onClick={goToNext}>
						<CircleArrowRight />
					</Button>
				</div>
			</div>
		</div>
	);
}
