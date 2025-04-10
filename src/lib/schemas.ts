import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(1, { message: "Please enter your full name" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
