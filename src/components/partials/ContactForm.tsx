import { actions } from "astro:actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { CircleCheckBig, Home, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { type ContactFormValues, contactFormSchema } from "@/lib/schemas";

export default function ContactForm() {

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState("");
	const turnstileRef = useRef<TurnstileInstance>(null);

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			fullName: "",
			email: "",
			phone: "",
			message: "",
		},
	});

	// Derive the client action types from the generated `actions` object
	type SendContactFormFn = (typeof actions)["sendContactForm"];
	type SendContactFormResult = Awaited<ReturnType<SendContactFormFn>>;

	async function onSubmit(data: ContactFormValues) {
		try {
			setIsSubmitting(true);

			// Build FormData to match the server action's expected "accept: 'form'" input
			const formData = new FormData();
			formData.append("fullName", data.fullName);
			formData.append("email", data.email);
			formData.append("phone", data.phone || "");
			formData.append("message", data.message || "");
			formData.append("cf-turnstile-response", turnstileToken);

			// Call the server action using the typed `actions` client
			const res: SendContactFormResult =
				await actions.sendContactForm(formData);

			// Handle SafeResult shape: { data: Output } | { error: ... }
			if (res.data?.success) {
				toast.success(res.data.message || "Message sent successfully!");
				form.reset();
				turnstileRef.current?.reset();
				setTurnstileToken("");
				setIsSuccess(true);
			} else if (res.error) {
				// ActionError or server-thrown error
				const msg =
					(res.error as { message?: string })?.message ||
					"Failed to send message";
				throw new Error(msg);
			} else {
				const msg = res.data?.message || "Failed to send message";
				throw new Error(msg);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to send message. Please try again.";
			toast.error(errorMessage);
			// Reset turnstile on error
			turnstileRef.current?.reset();
			setTurnstileToken("");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isSuccess) {
		return (
			<Card>
				<CardHeader className="flex flex-col items-center gap-4">
					<CircleCheckBig className="size-10 text-green-500" />
					<CardTitle className="font-bold text-2xl">
						Message Submitted
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					We will review your information and get back to you shortly.
				</CardContent>
				<CardFooter className="justify-center">
					<Button asChild>
						<a href="/">
							<Home className="size-5" />
							Return to Home
						</a>
					</Button>
				</CardFooter>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardDescription>
					Do you have any questions or need help with your account? Fill out the
					form below and we will get back to you as soon as possible.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="fullName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Full Name<span className="font-bold text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<Input {...field} required />
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
									<FormLabel>
										Email Address
										<span className="font-bold text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<Input type="email" {...field} required />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Phone Number
										<span className="font-bold text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<Input type="tel" {...field} required />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => {
								return (
									<FormItem>
										<FormLabel>
											Message
											<span className="font-bold text-red-500">*</span>
										</FormLabel>
										<FormControl>
											<>
												<Textarea
													className="min-h-25"
													{...field}
													maxLength={1000}
													required
												/>
												<div className={`text-right text-sm mt-1 ${field.value && field.value.length >= 1000 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
													{field.value ? field.value.length : 0}/1000 characters
												</div>
											</>
										</FormControl>
										<FormMessage />
									</FormItem>
								);
							}}
						/> 

						<Turnstile
							className="w-full"
							ref={turnstileRef}
							siteKey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}
							onSuccess={(token: string) => setTurnstileToken(token)}
							onError={() => {
								setTurnstileToken("");
								toast.error("Captcha verification failed. Please try again.");
							}}
							onExpire={() => setTurnstileToken("")}
							options={{
								theme: "dark",
								size: "flexible",
							}}
						/>

						<Button type="submit" disabled={isSubmitting || !turnstileToken}>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Submitting Request...
								</>
							) : (
								"Send Message"
							)}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
