import { CheckCircle2, CircleX, Loader2, Mail } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password";
import { toast } from "@/components/ui/toast";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [showPasswordLogin, setShowPasswordLogin] = useState(false);
	const [magicLinkSent, setMagicLinkSent] = useState(false);

	// Check for error query parameter on load
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const error = urlParams.get("error");
		if (error) {
			setErrorMessage(decodeURIComponent(error));
			toast.error(decodeURIComponent(error));

			// Clean up the URL
			const newUrl = window.location.pathname;
			window.history.replaceState({}, document.title, newUrl);
		}
	}, []);

	const handleMagicLinkLogin = async (event: React.SubmitEvent) => {
		event.preventDefault();
		if (!email) {
			setErrorMessage("Email is required");
			toast.error("Email is required");
			return;
		}

		setIsLoading(true);
		setErrorMessage("");

		try {
			const response = await signIn.magicLink({
				email,
				callbackURL: "/",
				errorCallbackURL: "/auth/login-error",
			});

			if (response?.error) {
				const errorMagicLink =
					response.error.message ||
					"Email address does not exist. Please sign up first.";
				setErrorMessage(errorMagicLink);
				toast.error(errorMagicLink);
				return;
			}

			setMagicLinkSent(true);
			toast.success("Magic link sent! Check your email.");
		} catch (error) {
			console.error("Magic link login failed", error);
			const errorMsg =
				error instanceof Error
					? error.message
					: "Failed to send magic link. Please try again.";
			setErrorMessage(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePasswordLogin = async (event: React.SubmitEvent) => {
		event.preventDefault();

		if (!email || !password) {
			setErrorMessage("Email and password are required");
			toast.error("Email and password are required");
			return;
		}

		setIsLoading(true);
		setErrorMessage("");

		try {
			const response = await signIn.email({
				email,
				password,
				callbackURL: "/",
				rememberMe: true,
			});

			if (response && !response.error) {
				toast.success("Login successful!");
				window.location.href = "/";
				return;
			}

			if (response.error) {
				const errorMsg =
					response.error.message || "Login failed. Please try again.";
				setErrorMessage(errorMsg);
				toast.error(errorMsg, {
					description: "Please check your credentials and try again.",
				});
				return;
			}
		} catch (error) {
			console.error("Login failed", error);
			const errorMsg =
				error instanceof Error
					? error.message
					: "Login failed. Please check your credentials and try again.";
			setErrorMessage(errorMsg);
			toast.error(errorMsg, {
				description: "Please check your credentials and try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full max-w-sm">
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Login to Your Account</CardTitle>
						<CardDescription>
							{showPasswordLogin
								? "Enter your account email address and password to login. If you would like to login without a password, click the Login with Magic Link button below."
								: "Enter your account email address to receive a Magic Link and login without a password."}
						</CardDescription>{" "}
					</CardHeader>
					<CardContent>
						{magicLinkSent ? (
							<div className="flex flex-col items-center gap-4 py-4">
								<CheckCircle2 className="h-12 w-12 text-green-500" />
								<div className="text-center">
									<p className="font-medium">Magic link sent!</p>
									<p className="text-muted-foreground text-sm">
										Please check your email for a link to login to your account.
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => {
										setMagicLinkSent(false);
										setEmail("");
									}}
								>
									Try another email
								</Button>
							</div>
						) : (
							<form
								onSubmit={
									showPasswordLogin ? handlePasswordLogin : handleMagicLinkLogin
								}
								noValidate
							>
								<div className="flex flex-col gap-6">
									<div className="grid gap-3">
										<Label htmlFor="email">Email</Label>
										<Input
											id="email"
											type="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											disabled={isLoading}
											autoComplete="email"
										/>
									</div>

									{showPasswordLogin && (
										<div className="grid gap-3">
											<div className="flex items-center">
												<Label htmlFor="password">Password</Label>
												<a
													href="/auth/forgot-password"
													className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
												>
													Forgot your password?
												</a>
											</div>
											<PasswordInput
												id="password"
												required
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												disabled={isLoading}
												autoComplete="current-password"
											/>
										</div>
									)}

									{errorMessage && (
										<div className="text-destructive inline-flex gap-1 text-sm font-bold">
											<CircleX className="size-4" />
											{errorMessage}
										</div>
									)}

									<div className="flex flex-col gap-3">
										<Button
											type="submit"
											className="w-full"
											disabled={isLoading}
										>
											{isLoading ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													{showPasswordLogin
														? "Logging in..."
														: "Sending Magic Link..."}
												</>
											) : showPasswordLogin ? (
												"Login"
											) : (
												<>
													<Mail className="size-4" />{" "}
													<span>Send Magic Link</span>
												</>
											)}
										</Button>
										<div className="relative my-4">
											<div className="absolute inset-0 flex items-center">
												<span className="w-full border-t" />
											</div>
											<div className="relative flex justify-center text-xs uppercase">
												<span className="bg-background text-muted-foreground px-2">
													Or continue with
												</span>
											</div>
										</div>

										<Button
											type="button"
											variant="reversed"
											className="w-full"
											onClick={() => setShowPasswordLogin(!showPasswordLogin)}
										>
											{showPasswordLogin
												? "Login with Magic Link"
												: "Login with Password"}
										</Button>
									</div>
								</div>
							</form>
						)}
					</CardContent>
					<CardFooter className="flex justify-center">
						<div className="text-center text-sm">
							Don&apos;t have an account?{" "}
							<a
								href="/auth/signup"
								className="text-accent-5 dark:text-accent-4 underline underline-offset-4"
							>
								Sign Up
							</a>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
