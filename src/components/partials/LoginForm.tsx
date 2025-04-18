import type React from "react";
import { useState, useEffect } from "react";
import { signIn } from "@/lib/auth-client";
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
import { PasswordInput } from "@/components/ui/password";
import { toast } from "sonner";
import { KeyRound, Loader2, Mail, CheckCircle2 } from "lucide-react";

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

  const handleMagicLinkLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setErrorMessage("Email is required");
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await signIn.magicLink({
        email,
        callbackURL: "/",
      });
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

  const handlePasswordLogin = async (event: React.FormEvent) => {
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
        toast.error(errorMsg);
        return;
      }
    } catch (error) {
      console.error("Login failed", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials and try again.";
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
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Choose your preferred login method
              </CardDescription>
            </CardHeader>
            <CardContent>
              {magicLinkSent ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium">Magic link sent!</p>
                    <p className="text-muted-foreground text-sm">
                      Please check your email for a link to login to your
                      account.
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
                    showPasswordLogin
                      ? handlePasswordLogin
                      : handleMagicLinkLogin
                  }
                  noValidate
                >
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

                    {showPasswordLogin && (
                      <div className="grid gap-3">
                        <div className="flex items-center">
                          <Label htmlFor="password">Password</Label>
                          <a
                            href="/login/forget-password"
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
                      <div className="text-destructive text-sm">
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
                              : "Sending magic link..."}
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

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={async () => {
                          await signIn.passkey({
                            fetchOptions: {
                              onError(context) {
                                alert(context.error.message);
                              },
                              onSuccess(context) {
                                window.location.href = "/";
                              },
                            },
                          });
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                        Login with Passkey
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                      >
                        {showPasswordLogin
                          ? "Use Magic Link instead"
                          : "Use password instead"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/signup" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
