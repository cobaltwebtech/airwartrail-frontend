import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const [, setThemeState] = React.useState<"light" | "dark" | "system">(
    "light",
  );

  // Initialize theme from localStorage and handle view transitions
  React.useEffect(() => {
    const handlePageLoad = () => {
      const storedTheme = localStorage.getItem("theme") || "light";
      setThemeState(storedTheme as "light" | "dark" | "system");

      // Ensure document class is in sync
      const isDark =
        storedTheme === "dark" ||
        (storedTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
    };

    // Initial load
    handlePageLoad();

    // Listen for Astro page loads
    document.addEventListener("astro:page-load", handlePageLoad);

    return () => {
      document.removeEventListener("astro:page-load", handlePageLoad);
    };
  }, []);

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);

    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", isDark);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="reversed" size="icon">
          <Moon className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Sun className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-4">
        <DropdownMenuItem onClick={() => setTheme("light")} className="text-lg">
          <Sun className="size-6" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="text-lg">
          <Moon className="size-6" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="text-lg"
        >
          <Monitor className="size-6" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
