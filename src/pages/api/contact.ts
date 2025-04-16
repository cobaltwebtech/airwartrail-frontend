import { Resend } from "resend";
import type { APIRoute } from "astro";
import { contactFormSchema } from "@/lib/schemas";
import { ContactEmail } from "@/components/email/ContactEmail";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the form data
    const body = await request.json();
    // Validate the form data
    const validatedData = contactFormSchema.parse(body);

    const { data, error } = await resend.emails.send({
      from: "Airwar Trail <noreply@contact.cobaltweb.tech>",
      to: "cgarza@cobaltweb.tech",
      subject: "New Contact Form Submission",
      react: await ContactEmail({
        fullName: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone || "",
        message: validatedData.message,
      }),
    });

    if (error) {
      console.error("Resend API error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing contact form:", error);

    // Return more detailed error information
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
