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
      autoplay={{
        delay: 3000,
        pauseOnMouseEnter: true,
      }}
      navigation={true}
      pagination={{
        clickable: true,
      }}
      modules={[Autoplay, Pagination, Navigation]}
      className="h-[500px] w-full"
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={index} className="h-full">
          <div className="grid h-full grid-cols-1 items-center gap-6 px-4 py-8 md:grid-cols-2 md:px-8 lg:px-12">
            <div className="order-2 md:order-1">
              <div className="text-center md:text-left">
                <h3 className="text-primary-foreground mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
                  {slide.title}
                </h3>
                <p className="text-primary-foreground mb-4 font-light md:text-lg">
                  {slide.description}
                </p>
              </div>
            </div>

            <div className="order-1 flex h-full items-center justify-center md:order-2">
              <img
                src={slide.image}
                className="max-h-[400px] w-auto rounded-md object-contain"
                alt={slide.alt}
              />
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
    //</div>
  );
}
