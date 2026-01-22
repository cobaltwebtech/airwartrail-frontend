import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password";
import { resetPassword } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function PasswordReset({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		// Clear any error messages when passwords change
		if (errorMessage) setErrorMessage("");
	}, [errorMessage]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!newPassword || !confirmPassword) {
			setErrorMessage("Both password fields are required");
			toast.error("Both password fields are required");
			return;
		}

		if (newPassword !== confirmPassword) {
			setErrorMessage("Passwords do not match");
			toast.error("Passwords do not match");
			return;
		}

		// Validate password using the schema
		try {
			passwordSchema.parse({ password: newPassword });
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errorMessage = error.issues[0].message;
				setErrorMessage(errorMessage);
				toast.error(errorMessage);
				return;
			}
		}

		setIsLoading(true);
		setErrorMessage("");

		try {
			const token = new URLSearchParams(window.location.search).get("token");
			if (!token) {
				setErrorMessage("Invalid or missing token");
				toast.error("Invalid or missing token");
				return;
			}
			await resetPassword({
				newPassword,
				token,
			});
			setIsSuccess(true);
			toast.success("Password has been reset successfully!");
		} catch (error) {
			console.error("Password reset failed", error);
			const errorMsg =
				error instanceof Error
					? error.message
					: "Failed to reset password. Please try again or request a new reset link.";
			setErrorMessage(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-[80svh] w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className={cn("flex flex-col gap-6", className)} {...props}>
					<Card>
						<CardHeader>
							<CardTitle>Reset your password</CardTitle>
							<CardDescription>Enter your new password below</CardDescription>
						</CardHeader>
						<CardContent>
							{isSuccess ? (
								<div className="flex flex-col items-center gap-4 py-4">
									<CheckCircle2 className="h-12 w-12 text-green-500" />
									<div className="text-center">
										<p className="font-medium">Password Reset Complete</p>
										<p className="text-muted-foreground text-sm">
											Your password has been reset successfully.
										</p>
									</div>
									<Button
										variant="default"
										onClick={() => {
											window.location.href = "/login";
										}}
									>
										Return to Login
									</Button>
								</div>
							) : (
								<form onSubmit={handleSubmit} noValidate>
									<div className="flex flex-col gap-6">
										<div className="grid gap-3">
											<Label htmlFor="password">New Password</Label>
											<PasswordInput
												id="password"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												disabled={isLoading}
												autoComplete="new-password"
											/>
										</div>

										<div className="grid gap-3">
											<Label htmlFor="confirmPassword">Confirm Password</Label>
											<PasswordInput
												id="confirmPassword"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												disabled={isLoading}
												autoComplete="new-password"
											/>
										</div>

										{errorMessage && (
											<div className="text-destructive text-sm">
												{errorMessage}
											</div>
										)}

										<Button
											type="submit"
											className="w-full"
											disabled={isLoading}
										>
											{isLoading ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Resetting password...
												</>
											) : (
												"Reset Password"
											)}
										</Button>
									</div>
								</form>
							)}
						</CardContent>
						<CardFooter className="flex justify-center">
							<div className="text-center text-sm">
								Remember your password?{" "}
								<a href="/login" className="underline underline-offset-4">
									Back to login
								</a>
							</div>
						</CardFooter>
					</Card>
				</div>
			</div>
		</div>
	);
}
