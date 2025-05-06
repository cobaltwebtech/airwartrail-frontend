import { useSession, subscription } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Loader2, BadgeAlert, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumSlideProps {
  title?: string;
  description?: string;
  image: string;
  alt?: string;
}

interface PremiumSlideShowProps {
  slideData: PremiumSlideProps[];
  premiumImagesUrl: string;
}

export function PremiumSlideShow({
  slideData,
  premiumImagesUrl,
}: PremiumSlideShowProps) {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkPremiumStatus() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: subscriptions } = await subscription.list();
        const activeSubscription = subscriptions?.find(
          (sub) => sub.status === "active" || sub.status === "trialing",
        );
        setIsPremium(!!activeSubscription);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    }

    if (mounted) {
      checkPremiumStatus();
    }
  }, [session?.user, mounted]);

  if (!mounted) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="bg-airwar-400 dark:bg-airwar-600 text-card-foreground my-10 rounded-lg p-4 text-center">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="font-semibold">
          Oh no! You're missing out on premium content!
        </p>
        <p className="text-sm">
          If you're seeing this then you're missing out on awesome premium
          content here which you can view if you upgrade to the Premium plan.
        </p>
        <p className="text-sm font-semibold">
          Subscribe now or login to view premium content.
        </p>
        <div className="mx-auto flex max-w-screen-sm flex-row justify-evenly gap-4">
          <a href="/signup">
            <Button>Sign Up to Subscribe</Button>
          </a>
          <a href="/login">
            <Button variant="secondary">Login</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-airwar-400 dark:bg-airwar-600 text-card-foreground my-10 rounded-lg p-4 text-center">
        <BadgeAlert className="text-accent-5 mx-auto size-16" />
        <p className="font-semibold">
          Oh no! You're missing out on premium content!
        </p>
        <p className="text-sm">
          If you're seeing this then you're missing out on awesome premium
          content here which you can view if you upgrade to the Premium plan.
        </p>
        <Button
          onClick={() =>
            subscription.upgrade({
              plan: "premium",
              successUrl: "/subscribe/success",
              cancelUrl: window.location.href,
            })
          }
        >
          Upgrade to Premium
        </Button>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="my-8 space-y-4">
        <Swiper
          slidesPerView={1}
          spaceBetween={30}
          loop={true}
          autoplay={{
            delay: 3000,
            pauseOnMouseEnter: true,
          }}
          navigation={true}
          modules={[Autoplay, Navigation]}
          className="bg-primary w-full rounded-lg"
        >
          {slideData.map((slide, index) => (
            <SwiperSlide key={index}>
              <div className="space-y-4 px-4 py-8 md:px-8 lg:px-12">
                <div className="flex items-center justify-center px-6 sm:p-0">
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
        <div>
          <p>
            You may download all images for your personal use by clicking the
            button below. High resolution images will be bundled in a .zip
            compressed format. If you would like to use any images for
            commercial purposes please send us a message on the{" "}
            <a href="/contact">contact page</a>.
          </p>
          <a href={premiumImagesUrl}>
            <Button>
              <Download />
              Download Bonus Images
            </Button>
          </a>
        </div>
      </div>
    );
  }
}
