import { useState, useEffect } from "react";
import { useSession, client, forgetPassword } from "@/lib/auth-client";
import { changePassword } from "@/lib/auth-client";
import { passwordSchema } from "@/lib/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "../ui/password";

export function UserCredentials() {
  const session = useSession();
  const user = session.data?.user;
  const status = session.isPending
    ? "loading"
    : session.data
      ? "authenticated"
      : "unauthenticated";
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function checkForCredentials() {
      if (user) {
        try {
          const accounts = await client.listAccounts();
          // Check if any account is of type 'credentials'
          const hasCredentials =
            accounts.data?.some(
              (account) => account.provider === "credential",
            ) ?? false;
          setHasPassword(hasCredentials);
        } catch (error) {
          console.error("Failed to check credentials:", error);
          setHasPassword(false);
        }
      }
    }

    if (status === "authenticated") {
      checkForCredentials();
    }
  }, [user, status]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  const validateForm = () => {
    try {
      // First check if current password exists
      if (!passwordData.currentPassword) {
        throw new Error("Current password is required");
      }

      // Then check if new passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Finally validate new password against schema
      passwordSchema.parse({ password: passwordData.newPassword });

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ newPassword: error.errors[0].message });
      } else if (error instanceof Error) {
        setErrors({
          currentPassword: error.message.includes("Current")
            ? error.message
            : "",
          confirmPassword: error.message.includes("match") ? error.message : "",
        });
      }
      return false;
    }
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        revokeOtherSessions: true,
      });

      toast.success("Password changed successfully");
      setOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Failed to change password. Please try again.");
    } finally {
      setIsChangingPassword(false);
      setIsLoading(true);
    }
  };

  const handleSetPasswordClick = async () => {
    if (!user?.email) return;

    try {
      await forgetPassword({
        email: user.email,
        redirectTo: "/login/reset-password",
      });
      setIsSuccess(true);
      toast.success("Check your email for a link to set your password");
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email. Please try again.");
    }
  };

  if (status === "loading" || hasPassword === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Password</CardTitle>
          <CardDescription>Loading password information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="leading-relaxed">Account Password</CardTitle>
            <CardDescription>
              {hasPassword
                ? "Update your account password"
                : "Your account does not have a password set"}
            </CardDescription>
          </div>
          <div className="bg-accent-1 rounded-full p-2">
            <Lock className="text-secondary-foreground size-6" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasPassword ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Update Password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change your password</DialogTitle>
                <DialogDescription>
                  Enter your current password and a new password below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    required
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  {errors.currentPassword && (
                    <p className="text-sm text-red-500">
                      {errors.currentPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    required
                    autoComplete="new-password"
                    value={passwordData.newPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-500">{errors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    autoComplete="new-password"
                    value={passwordData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="space-y-4">
            {isSuccess ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium">Check your email</p>
                  <p className="text-muted-foreground text-sm">
                    We've sent you a link to set your password.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false);
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  You are currently using the password-free method of Magic Link
                  to login to your account. You can continue to use this method
                  or if you would like to set a password for your account,
                  please click the button below.
                </p>
                <p className="text-muted-foreground text-sm">
                  Be sure your email address is correct before setting a
                  password since we will send a link to your email to set your
                  password.
                </p>
                <Button variant="outline" onClick={handleSetPasswordClick}>
                  <Lock className="mr-2 h-4 w-4" />
                  Set Password
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
