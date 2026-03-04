import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
	changePassword,
	client,
	requestPasswordReset,
	useSession,
} from "@/lib/auth-client";
import { passwordSchema } from "@/lib/schemas";
import { PasswordInput } from "../ui/password";

function UserCredentialsContent() {
	const queryClient = useQueryClient();
	const session = useSession();
	const user = session.data?.user;
	const isAuthenticated = !session.isPending && !!session.data;

	// Query user accounts to check if they have a credential (password) account
	const { data: hasPassword, isLoading: isCheckingPassword } = useQuery({
		queryKey: ["user-accounts", user?.id],
		queryFn: async () => {
			const accounts = await client.listAccounts();
			// Check if any account is of type 'credential'
			return (
				accounts.data?.some((account) => account.providerId === "credential") ??
				false
			);
		},
		enabled: isAuthenticated && !!user,
		staleTime: 1000 * 60 * 60, // 1 hour
	});

	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [open, setOpen] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordData({
			...passwordData,
			[e.target.name]: e.target.value,
		});
		// Clear error for this field when user types
		if (errors[e.target.name]) {
			setErrors({
				...errors,
				[e.target.name]: "",
			});
		}
	};

	const validateForm = () => {
		try {
			// First check if current password exists
			if (!passwordData.currentPassword) {
				throw new Error("Current password is required");
			}

			// Then check if new passwords match
			if (passwordData.newPassword !== passwordData.confirmPassword) {
				throw new Error("Passwords do not match");
			}

			// Finally validate new password against schema
			passwordSchema.parse({ password: passwordData.newPassword });

			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				setErrors({ newPassword: error.issues[0].message });
			} else if (error instanceof Error) {
				setErrors({
					currentPassword: error.message.includes("Current")
						? error.message
						: "",
					confirmPassword: error.message.includes("match") ? error.message : "",
				});
			}
			return false;
		}
	};

	const handleChangePassword = async () => {
		if (!validateForm()) return;

		setIsChangingPassword(true);
		try {
			await changePassword({
				currentPassword: passwordData.currentPassword,
				newPassword: passwordData.newPassword,
				revokeOtherSessions: true,
			});

			// Invalidate cache to reflect any changes in credential status
			await queryClient.invalidateQueries({
				queryKey: ["user-accounts", user?.id],
			});

			toast.success("Password changed successfully");
			setOpen(false);
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (error) {
			console.error("Failed to change password:", error);
			toast.error("Failed to change password. Please try again.");
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleSetPasswordClick = async () => {
		if (!user?.email) return;

		try {
			await requestPasswordReset({
				email: user.email,
				redirectTo: "/auth/reset-password",
			});
			setIsSuccess(true);
			toast.success("Check your email for a link to set your password");
		} catch (error) {
			console.error("Failed to send email:", error);
			toast.error("Failed to send email. Please try again.");
		}
	};

	if (session.isPending || isCheckingPassword || hasPassword === undefined) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Account Password</CardTitle>
					<CardDescription>Loading password information...</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center py-6">
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
						<CardTitle className="leading-relaxed">Account Password</CardTitle>
						<CardDescription>
							{hasPassword
								? "Update your account password"
								: "Your account does not have a password set"}
						</CardDescription>
					</div>
					<div className="bg-accent-1 rounded-full p-2">
						<Lock className="text-secondary-foreground size-6" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{hasPassword ? (
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button variant="secondary">Update Password</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Change your password</DialogTitle>
								<DialogDescription>
									Enter your current password and a new password below.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-2">
								<div className="space-y-2">
									<Label htmlFor="currentPassword">Current Password</Label>
									<PasswordInput
										id="currentPassword"
										name="currentPassword"
										required
										autoComplete="current-password"
										value={passwordData.currentPassword}
										onChange={handleInputChange}
										disabled={isChangingPassword}
									/>
									{errors.currentPassword && (
										<p className="text-sm text-red-500">
											{errors.currentPassword}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="newPassword">New Password</Label>
									<PasswordInput
										id="newPassword"
										name="newPassword"
										required
										autoComplete="new-password"
										value={passwordData.newPassword}
										onChange={handleInputChange}
										disabled={isChangingPassword}
									/>
									{errors.newPassword && (
										<p className="text-sm text-red-500">{errors.newPassword}</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="confirmPassword">Confirm New Password</Label>
									<PasswordInput
										id="confirmPassword"
										name="confirmPassword"
										required
										autoComplete="new-password"
										value={passwordData.confirmPassword}
										onChange={handleInputChange}
										disabled={isChangingPassword}
									/>
									{errors.confirmPassword && (
										<p className="text-sm text-red-500">
											{errors.confirmPassword}
										</p>
									)}
								</div>
							</div>
							<DialogFooter>
								<Button
									onClick={handleChangePassword}
									disabled={isChangingPassword}
								>
									{isChangingPassword && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Save Changes
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				) : (
					<div className="space-y-4">
						{isSuccess ? (
							<div className="flex flex-col items-center gap-4 py-4">
								<CheckCircle2 className="h-12 w-12 text-green-500" />
								<div className="text-center">
									<p className="font-medium">Check your email</p>
									<p className="text-muted-foreground text-sm">
										We've sent you a link to set your password.
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => {
										setIsSuccess(false);
									}}
								>
									Try again
								</Button>
							</div>
						) : (
							<>
								<p className="text-muted-foreground text-sm">
									You are currently using the password-free method of Magic Link
									to login to your account. You can continue to use this method
									or if you would like to set a password for your account,
									please click the button below.
								</p>
								<p className="text-muted-foreground text-sm">
									Be sure your email address is correct before setting a
									password since we will send a link to your email to set your
									password.
								</p>
								<Button variant="outline" onClick={handleSetPasswordClick}>
									<Lock className="mr-2 h-4 w-4" />
									Set Password
								</Button>
							</>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * UserCredentials with QueryProvider wrapper
 *
 * Handles checking if user has a password set and allows updating or setting a password.
 *
 * @example
 * ```astro
 * <UserCredentials client:load />
 * ```
 */
export function UserCredentials() {
	return (
		<QueryProvider>
			<UserCredentialsContent />
		</QueryProvider>
	);
}

export default UserCredentials;
