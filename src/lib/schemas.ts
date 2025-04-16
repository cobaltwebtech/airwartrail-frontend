import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(1, { message: "Please enter your full name" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

export const contactFormSchema = z.object({
  fullName: z.string().min(1, { message: "Please enter your full name" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(1, { message: "Please enter your phone number" }),
  message: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
