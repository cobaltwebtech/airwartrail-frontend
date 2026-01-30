import { CircleUserRound, Loader2, Pencil, ShieldUser } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	changeEmail,
	sendVerificationEmail,
	updateUser,
	useSession,
} from "@/lib/auth-client";

function UserInfoContent() {
	const session = useSession();
	const user = session.data?.user;
	const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
	const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isSendingVerification, setIsSendingVerification] = useState(false);
	const [nameInput, setNameInput] = useState("");
	const [emailInput, setEmailInput] = useState("");

	// Check if user is admin
	const isAdmin = user?.role === "admin";

	// Logic for updating the name
	const handleNameSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (nameInput && nameInput !== user?.name) {
				await updateUser({ name: nameInput });
				toast.success("Name updated successfully");
			}
			setIsNameDialogOpen(false);
		} catch (error) {
			console.error("Failed to update name:", error);
			toast.error("Failed to update name. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Function to update email in Stripe
	const updateStripeEmail = async (customerId: string, email: string) => {
		try {
			const response = await fetch("/api/stripe/update-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ customerId, email }),
			});

			if (!response.ok) {
				throw new Error("Failed to update email in Stripe");
			}
			console.log("Email updated in Stripe successfully", response);

			return await response.json();
		} catch (error) {
			console.error("Error updating email in Stripe:", error);
			throw error;
		}
	};

	// Logic for updating the email
	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (emailInput && emailInput !== user?.email) {
				// First, update the email with Better Auth
				await changeEmail({
					newEmail: emailInput,
					callbackURL: "/account",
				});

				// Then update the email in Stripe if the user has a stripeCustomerId
				if (user?.stripeCustomerId) {
					await updateStripeEmail(user.stripeCustomerId, emailInput);
				}

				toast.success(
					"Verification sent to your prior email address. Please check your inbox.",
				);
			}
			setIsEmailDialogOpen(false);
		} catch (error) {
			console.error("Failed to update email:", error);
			toast.error("Failed to update email. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Logic for sending a verification email
	const handleSendVerification = async () => {
		if (!user?.email) return;

		setIsSendingVerification(true);
		try {
			await sendVerificationEmail({
				email: user.email,
				callbackURL: "/account",
			});
			toast.success("Verification email sent. Please check your inbox.");
		} catch (error) {
			console.error("Failed to send verification email:", error);
			toast.error("Failed to send verification email. Please try again.");
		} finally {
			setIsSendingVerification(false);
		}
	};

	// Show loading state while session is being fetched
	if (session.isPending) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Personal Information</CardTitle>
							<CardDescription>
								Update your personal information and email address
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="leading-relaxed">
							Personal Information
						</CardTitle>
						<CardDescription>
							Update your personal information and email address
						</CardDescription>
					</div>
					<div className="bg-accent-1 rounded-full p-2">
						<CircleUserRound className="text-secondary-foreground size-6" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{/* Admin Badge - Only visible to admin users */}
				{isAdmin && (
					<div className="border-border bg-accent-6 mb-4 rounded-lg border p-4">
						<div className="flex items-center gap-2">
							<ShieldUser className="text-destructive size-6" />
							<p className="text-sm font-semibold">Administrator Account</p>
						</div>
						<p className="mt-1 text-xs">
							You have admin privileges and access to all premium content.
						</p>
					</div>
				)}
				<div className="flex items-center justify-between">
					<div>
						<p className="text-muted-foreground text-sm font-medium">Name</p>
						<p className="text-lg">{user?.name || "Not set"}</p>
					</div>
					<Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="icon">
								<Pencil className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Update Name</DialogTitle>
								<DialogDescription>
									Enter your new name below.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleNameSubmit}>
								<div className="grid gap-4 py-4">
									<div className="grid grid-cols-4 items-center gap-4">
										<Label htmlFor="name" className="text-right">
											Name
										</Label>
										<Input
											id="name"
											value={nameInput}
											placeholder={user?.name || "Enter your name"}
											onChange={(e) => setNameInput(e.target.value)}
											className="col-span-3"
										/>
									</div>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={isLoading || !nameInput}>
										{isLoading ? "Saving..." : "Update Name"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-muted-foreground text-sm font-medium">Email</p>
						<p className="text-lg">{user?.email}</p>
						<p
							className={`mt-1 text-sm ${user?.emailVerified ? "text-green-600" : "text-yellow-600"}`}
						>
							{user?.emailVerified
								? "✓ Email verified"
								: "⚠ Email not verified. Check your inbox for a verification email."}
						</p>
						{!user?.emailVerified && (
							<Button
								variant="link"
								size="sm"
								className="mt-1 h-auto p-0 text-blue-500"
								onClick={handleSendVerification}
								disabled={isSendingVerification}
							>
								{isSendingVerification ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</>
								) : (
									"Resend Verification Email"
								)}
							</Button>
						)}
					</div>
					<Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="icon">
								<Pencil className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Update Email</DialogTitle>
								<DialogDescription>
									Enter your new email address below. You'll need to confirm
									your change of email before it can be updated. A verification
									will be sent to your prior email address.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleEmailSubmit}>
								<div className="grid gap-4 py-4">
									<div className="grid grid-cols-4 items-center gap-4">
										<Label htmlFor="email" className="text-right">
											Email
										</Label>
										<Input
											id="email"
											type="email"
											value={emailInput}
											placeholder={user?.email || "Enter your email"}
											onChange={(e) => setEmailInput(e.target.value)}
											className="col-span-3"
										/>
									</div>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={isLoading || !emailInput}>
										{isLoading ? "Saving..." : "Update Email"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * UserInfo with QueryProvider wrapper
 *
 * Displays and allows editing of user personal information.
 *
 * @example
 * ```astro
 * <UserInfo client:load />
 * ```
 */
export function UserInfo() {
	return (
		<QueryProvider showDevtools={false}>
			<UserInfoContent />
		</QueryProvider>
	);
}

export default UserInfo;
