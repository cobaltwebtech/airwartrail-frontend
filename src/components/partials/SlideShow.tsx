// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

// import required modules
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

interface SlideProps {
  title: string;
  description: string;
  image: string;
  alt: string;
}

interface SlideShowProps {
  slides: SlideProps[];
}

export function SlideShow({ slides }: SlideShowProps) {
  return (
    //<div className="w-full">
    <Swiper
      slidesPerView={1}
      spaceBetween={30}
      loop={true}
      autoplay={{
        delay: 3000,
        pauseOnMouseEnter: true,
      }}
      navigation={true}
      pagination={{
        clickable: true,
      }}
      modules={[Autoplay, Pagination, Navigation]}
      className="w-full"
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={index}>
          <div className="space-y-4 px-4 py-8 md:px-8 lg:px-12">
            <div className="flex items-center justify-center px-6 sm:p-0">
              <img
                src={slide.image}
                className="max-h-[400px] w-auto rounded-md object-contain"
                alt={slide.alt}
              />
            </div>
            <div className="mb-4 space-y-4 text-center">
              <h3 className="text-primary-foreground text-2xl font-bold md:text-3xl lg:text-4xl">
                {slide.title}
              </h3>
              <p className="text-accent-foreground font-light md:text-lg">
                {slide.description}
              </p>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
    //</div>
  );
}
