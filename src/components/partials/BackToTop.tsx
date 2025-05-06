import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Function to toggle button visibility based on scroll position
  const toggleBackToTopButton = () => {
    if (window.scrollY > 200) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", toggleBackToTopButton);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("scroll", toggleBackToTopButton);
    };
  }, []);

  return (
    <Button
      onClick={scrollToTop}
      className={`bg-accent-foreground text-background fixed right-5 bottom-5 cursor-pointer rounded-full p-2 shadow-lg transition-opacity duration-300 ${
        isVisible ? "visible opacity-100" : "invisible opacity-0"
      }`}
      aria-label="Back to Top"
    >
      <ArrowUp className="size-8" />
    </Button>
  );
}
