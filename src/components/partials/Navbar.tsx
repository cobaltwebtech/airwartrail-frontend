import {
  SquareMenu,
  CircleX,
  CircleUserRound,
  LogOut,
  SquareUserRound,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  title: string;
  url: string;
}
//Array for menu items with Astro Icons
const navItems: Array<NavItem> = [
  {
    title: "Episodes",
    url: "/episodes",
  },
  { title: "About", url: "/about" },
  { title: "Contact", url: "/contact" },
];

const Navbar = () => {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("You have been successfully logged out");
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <header className="bg-secondary sticky inset-x-0 top-0 z-50 flex w-full flex-wrap py-6 lg:flex-nowrap lg:justify-start">
      <nav className="relative mx-auto flex w-full max-w-screen-xl basis-full flex-wrap items-center px-4 md:px-6 lg:grid lg:grid-cols-12 lg:px-8">
        <div className="flex items-center lg:col-span-3">
          {/* Logo */}
          <a
            className="inline-block flex-none rounded-xl text-xl font-semibold focus:opacity-80 focus:outline-hidden"
            href="/"
            aria-label="Airwar Trail Logo"
          >
            <svg
              className="h-auto w-10"
              width="100"
              height="100"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" rx="10" fill="black"></rect>
              <path
                d="M37.656 68V31.6364H51.5764C54.2043 31.6364 56.3882 32.0507 58.1283 32.8793C59.8802 33.696 61.1882 34.8146 62.0523 36.2351C62.9282 37.6555 63.3662 39.2654 63.3662 41.0646C63.3662 42.5443 63.0821 43.8108 62.5139 44.8643C61.9458 45.906 61.1823 46.7524 60.2235 47.4034C59.2646 48.0544 58.1934 48.522 57.0097 48.8061V49.1612C58.2999 49.2322 59.5369 49.6288 60.7206 50.3509C61.9162 51.0611 62.8927 52.0672 63.6503 53.3693C64.4079 54.6714 64.7867 56.2457 64.7867 58.0923C64.7867 59.9744 64.3309 61.6671 63.4195 63.1705C62.508 64.6619 61.1349 65.8397 59.3002 66.7038C57.4654 67.5679 55.1572 68 52.3754 68H37.656ZM44.2433 62.4957H51.3279C53.719 62.4957 55.4413 62.04 56.4948 61.1286C57.5601 60.2053 58.0928 59.0215 58.0928 57.5774C58.0928 56.5002 57.8264 55.5296 57.2938 54.6655C56.7611 53.7895 56.0035 53.103 55.021 52.6058C54.0386 52.0968 52.8667 51.8423 51.5054 51.8423H44.2433V62.4957ZM44.2433 47.1016H50.7597C51.896 47.1016 52.92 46.8944 53.8314 46.4801C54.7429 46.054 55.459 45.4562 55.9798 44.6868C56.5125 43.9055 56.7789 42.9822 56.7789 41.9169C56.7789 40.5083 56.2817 39.3482 55.2874 38.4368C54.3049 37.5253 52.843 37.0696 50.9017 37.0696H44.2433V47.1016Z"
                fill="white"
              ></path>
            </svg>
          </a>

          <div className="ms-1 sm:ms-2"></div>
        </div>

        {/* Button Group */}
        <div className="ms-auto flex items-center gap-x-1 py-1 lg:order-3 lg:col-span-3 lg:gap-x-2 lg:ps-6">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" className="gap-2">
                  <SquareUserRound className="size-6" />
                  <span className="sr-only">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-4">
                <DropdownMenuItem asChild className="text-lg">
                  <a href="/account">
                    <CircleUserRound className="size-6" />
                    My Account
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-lg">
                  <LogOut className="size-6" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <a href="/login">
                <Button type="button">Login</Button>
              </a>
              <a href="/signup">
                <Button type="button" variant="outline">
                  Sign Up
                </Button>
              </a>
            </>
          )}

          <ThemeToggle />

          <div className="lg:hidden">
            <Button
              type="button"
              className="hs-collapse-toggle flex size-9.5 items-center justify-center"
              id="hs-navbar-hcail-collapse"
              aria-expanded="false"
              aria-controls="hs-navbar-hcail"
              aria-label="Toggle navigation"
              data-hs-collapse="#hs-navbar-hcail"
            >
              <SquareMenu className="hs-collapse-open:hidden size-4 shrink-0" />
              <CircleX className="hs-collapse-open:block hidden size-4 shrink-0" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </div>
        </div>

        {/* Collapse */}
        <div
          id="hs-navbar-hcail"
          className="hs-collapse hidden grow basis-full overflow-hidden transition-all duration-300 lg:order-2 lg:col-span-6 lg:block lg:w-auto lg:basis-auto"
          aria-labelledby="hs-navbar-hcail-collapse"
        >
          {/* Menu Items */}
          <ul className="mt-5 flex flex-col gap-x-0 gap-y-4 lg:mt-0 lg:flex-row lg:items-center lg:justify-center lg:gap-x-7 lg:gap-y-0">
            {navItems.map(({ title, url }) => (
              <li key={url}>
                <a
                  className="text-md flex items-center justify-start py-4 font-semibold text-nowrap lg:justify-center"
                  href={url}
                >
                  <span className="text-white">{title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
