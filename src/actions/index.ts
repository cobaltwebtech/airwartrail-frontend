import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";
import { ContactForm } from "@/components/email/ContactForm";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Validate form inputs with Zod
const contactFormSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address"),
	phone: z.string().min(1, "Phone number is required"),
	message: z.string().min(1, "Please provide additional info"),
	"cf-turnstile-response": z
		.string({ required_error: "CAPTCHA verification is required" })
		.min(1, "CAPTCHA verification is required"),
});

// Verify Cloudflare Turnstile token
async function verifyTurnstileToken(token: string): Promise<boolean> {
	const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;

	const formData = new FormData();
	formData.append("secret", secretKey);
	formData.append("response", token);

	try {
		const result = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				body: formData,
			},
		);

		const outcome = (await result.json()) as { success: boolean };
		return outcome.success;
	} catch (error) {
		console.error("Turnstile verification error:", error);
		return false;
	}
}

export const server = {
	sendContactForm: defineAction({
		accept: "form",
		input: contactFormSchema,
		handler: async (input) => {
			// Verify Turnstile token server-side
			const isValidToken = await verifyTurnstileToken(
				input["cf-turnstile-response"],
			);

			if (!isValidToken) {
				throw new ActionError({
					code: "UNAUTHORIZED",
					message: "CAPTCHA verification failed. Please try again.",
				});
			}

			// Pass form data to React email component
			const emailHtml = ContactForm(input);

			// Send email via Resend
			const { data, error } = await resend.emails.send({
				from: "Air War Trail <contact@notify.airwartrail.com>",
				to: "vwilliams@ophfoundation.org",
				replyTo: input.email,
				subject: `New Contact Submission from ${input.fullName}`,
				react: await emailHtml,
			});

			if (error) {
				console.error("Resend error:", error);
				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to send email. Please try again later.",
				});
			}

			console.log(
				`Contact form email sent successfully. Resend email ID: ${data?.id}`,
			);
			return {
				success: true,
				message: "Your message has been sent successfully!",
				emailId: data?.id,
			};
		},
	}),
};
