import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			fullName: "",
			email: "",
			phone: "",
			message: "",
		},
	});

	interface ApiErrorResponse {
		details?: string;
	}

	async function onSubmit(data: ContactFormValues) {
		try {
			setIsSubmitting(true);
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = (await response.json()) as ApiErrorResponse;
				throw new Error(errorData.details || "Failed to send message");
			}

			toast.success("Message sent successfully!");
			form.reset();
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to send message. Please try again.";
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card>
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
									Email Address<span className="font-bold text-red-500">*</span>
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
									Phone Number<span className="font-bold text-red-500">*</span>
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
						render={({ field }) => (
							<FormItem>
								<FormLabel>Message (Optional)</FormLabel>
								<FormControl>
									<Textarea
										className="min-h-[100px]"
										{...field}
										maxLength={500}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Sending..." : "Send Message"}
					</Button>
				</form>
			</Form>
		</Card>
	);
}
