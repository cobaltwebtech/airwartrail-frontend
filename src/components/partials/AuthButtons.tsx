import { useState, useEffect } from "react";
import { Loader, CircleUserRound, LogOut, SquareUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import type { ActiveSession } from "@/types";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuthButtonsProps {
  sessionData: ActiveSession | null;
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
      await signOut();
      toast.success("You have been successfully logged out");
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  // Show nothing during server-side rendering
  if (!mounted) {
    return (
      <div>
        <Loader className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-x-4">
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
    </div>
  );
}
