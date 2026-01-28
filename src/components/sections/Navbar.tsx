import type { Session } from "better-auth";
import {
	CircleUserRound,
	CircleX,
	Loader2,
	LogOut,
	SquareMenu,
	SquareUserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AwtLogo } from "@/components/partials/Logo";
import { ThemeToggle } from "@/components/partials/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { revokeSessions, signOut, useSession } from "@/lib/auth-client";

interface NavbarProps {
	sessionData: Session | null | undefined;
}

interface NavItem {
	title: string;
	url: string;
}

// Menu items for unauthenticated users
const publicNavItems: Array<NavItem> = [
	{ title: "Subscribe Now", url: "/subscribe" },
	{ title: "Free Content", url: "/streaming/basic" },
	{ title: "Coming Soon", url: "/coming-soon" },
	{ title: "About", url: "/about" },
];

// Menu items for authenticated users
const authenticatedNavItems: Array<NavItem> = [
	{ title: "Premium Content", url: "/streaming/premium" },
	{ title: "Film Series", url: "/film-series" },
	{ title: "Coming Soon", url: "/coming-soon" },
	{ title: "About", url: "/about" },
];

export default function Navbar({ sessionData }: NavbarProps) {
	const [mounted, setMounted] = useState(false);
	const { data: clientSession } = useSession();
	const session = clientSession || sessionData;

	useEffect(() => {
		setMounted(true);
	}, []);

	const isAuthenticated = Boolean(session);

	// Select the appropriate menu items based on authentication status
	const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

	const handleSignOut = async () => {
		try {
			await revokeSessions();
			await signOut();
			toast.success("You have been successfully logged out");
			window.location.href = "/";
		} catch (error) {
			console.error("Sign out failed:", error);
			toast.error("Failed to sign out. Please try again.");
		}
	};

	return (
		<header className="text-light bg-airwar-600 dark:bg-airwar-900 sticky inset-x-0 top-0 z-50 mx-auto w-full px-4 sm:px-6">
			<nav className="relative mx-auto grid w-full grid-cols-6 items-center rounded-3xl px-4 md:px-6 lg:grid-cols-8 lg:px-6 xl:px-8">
				<div className="col-span-4 sm:py-2 lg:col-span-2">
					<a
						className="flex items-center gap-x-2"
						href="/"
						aria-label="Air War Trail Logo"
					>
						<AwtLogo className="size-20 md:size-22" />
						<span className="text-xl font-bold sm:text-2xl xl:text-4xl text-nowrap">
							Air War Trail
						</span>
					</a>
				</div>

				<div className="col-span-2 col-end-7 ms-auto flex items-center gap-x-2 py-1 lg:order-3 lg:col-span-1 lg:col-end-9">
					{/* Auth Buttons */}
					{!mounted ? (
						<div>
							<Loader2 className="size-6 animate-spin" />
						</div>
					) : session ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="icon">
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
						<div className="flex flex-row gap-x-2 lg:gap-x-4">
							<a href="/login">
								<Button className="h-9 px-1 text-xs sm:px-4 sm:text-lg">
									Login
								</Button>
							</a>
						</div>
					)}

					<ThemeToggle />

					<div className="lg:hidden">
						<Button
							type="button"
							size="icon"
							className="hs-collapse-toggle flex items-center justify-center"
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

				<div
					id="hs-navbar-hcail"
					className="hs-collapse col-span-full hidden overflow-hidden p-5 transition-all duration-300 lg:order-2 lg:col-span-5 lg:col-end-8 lg:block lg:p-0"
				>
					{!mounted ? (
						<div className="flex justify-end">
							<Loader2 className="size-6 animate-spin" />
						</div>
					) : (
						<ul className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-end lg:gap-4">
							{navItems.map(({ title, url }) => (
								<li key={url}>
									<Button asChild variant="ghost">
										<a href={url}>
											<span className="text-md font-semibold text-nowrap">
												{title}
											</span>
										</a>
									</Button>
								</li>
							))}
						</ul>
					)}
				</div>
			</nav>
		</header>
	);
}
