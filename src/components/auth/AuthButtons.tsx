import type { Session } from "better-auth";
import {
	CircleUserRound,
	Loader2,
	LogOut,
	SquareUserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { revokeSessions, signOut, useSession } from "@/lib/auth-client";

interface AuthButtonsProps {
	sessionData: Session | null;
}

export function AuthButtons({ sessionData }: AuthButtonsProps) {
	const [mounted, setMounted] = useState(false);
	const { data: clientSession } = useSession();
	const session = clientSession || sessionData;

	useEffect(() => {
		setMounted(true);
	}, []);

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

	// Show a loading animation during server-side rendering
	if (!mounted) {
		return (
			<div>
				<Loader2 className="size-6 animate-spin" />
			</div>
		);
	}

	return (
		<>
			{session ? (
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
		</>
	);
}
