import { useState } from "react";
import { forgetPassword } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ForgotPassword({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      setErrorMessage("Email is required");
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await forgetPassword({
        email,
        redirectTo: "/login/reset-password",
      });
      setIsSuccess(true);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      console.error("Password reset request failed", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to process password reset request. Please try again.";
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
              <CardDescription>
                Enter your email address and we'll send you a link to reset your
                password
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium">Check your email</p>
                    <p className="text-muted-foreground text-sm">
                      We've sent you a link to reset your password.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail("");
                    }}
                  >
                    Try another email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        autoComplete="email"
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
                          Sending reset link...
                        </>
                      ) : (
                        "Send Reset Link"
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
