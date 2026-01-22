import type React from "react";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/lib/schemas";
import { PasswordInput } from "@/components/ui/password";
import { CheckCircle2 } from "lucide-react";

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const form = useForm<SignupFormValues & { confirmPassword: string }>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (
		data: SignupFormValues & { confirmPassword: string },
	) => {
		setIsLoading(true);
		setError(null);
		setSuccess(false);

		if (data.password !== data.confirmPassword) {
			setError("Passwords do not match");
			setIsLoading(false);
			return;
		}

		try {
			const { error: signupError } = await signUp.email({
				email: data.email,
				password: data.password,
				name: data.fullName,
				callbackURL: "/subscribe/upgrade",
			});

			if (signupError) {
				setError(signupError.message ?? "Sign up failed. Please try again.");
				return;
			}

			setSuccess(true);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to sign up. Please try again.",
			);
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
							<CardTitle className="text-xl">Sign Up</CardTitle>
							<CardDescription className="text-xs md:text-sm">
								Enter your information to create an account.
							</CardDescription>
							<CardDescription className="text-xs md:text-sm">
								A verification link will be sent to the email address you
								provide.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{error && (
								<div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
									{error}
								</div>
							)}
							{success ? (
								<div className="flex flex-col items-center gap-4 py-4">
									<CheckCircle2 className="h-12 w-12 text-green-500" />
									<div className="text-center">
										<p className="font-medium">Verification Email Sent!</p>
										<p className="text-muted-foreground text-sm">
											Please check your email for a link to login to your
											account.
										</p>
									</div>
								</div>
							) : (
								<Form {...form}>
									<form
										onSubmit={form.handleSubmit(onSubmit)}
										className="space-y-4"
									>
										<FormField
											control={form.control}
											name="fullName"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Full Name</FormLabel>
													<FormControl>
														<Input {...field} disabled={isLoading} required />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="email"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Email</FormLabel>
													<FormControl>
														<Input
															type="email"
															{...field}
															disabled={isLoading}
															required
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="password"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Password</FormLabel>
													<FormControl>
														<PasswordInput
															{...field}
															disabled={isLoading}
															id="password"
															required
															autoComplete="new-password"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="confirmPassword"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Confirm Password</FormLabel>
													<FormControl>
														<PasswordInput
															{...field}
															disabled={isLoading}
															id="confirmPassword"
															required
															autoComplete="new-password"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<Button
											type="submit"
											className="w-full"
											disabled={isLoading}
										>
											{isLoading ? "Creating Account..." : "Sign Up"}
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
										<p className="text-center text-sm">
											Already have an account?{" "}
											<a
												href="/login"
												className="text-accent-5 dark:text-accent-4 underline underline-offset-4"
											>
												Login Here
											</a>
										</p>
									</form>
								</Form>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
