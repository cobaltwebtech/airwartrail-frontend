import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { changePassword } from "@/lib/auth-client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

export function UserCredentials() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const hasPassword = session?.user.id ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      setIsLoading(false);
      return;
    }

    try {
      if (hasPassword) {
        // Change existing password
        await changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
      } else {
        // Set initial password for Magic Link user
        await setPassword({
          password: formData.newPassword,
        });
      }

      toast.success(
        hasPassword
          ? "Password updated successfully."
          : "Password set successfully. You can now use email/password login.",
      );
      setIsOpen(false);

      // Reset form data
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      console.error("Failed to handle password operation:", errorMessage);

      toast.error(
        hasPassword
          ? `Failed to update password: ${errorMessage}`
          : `Failed to set password: ${errorMessage}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Manage your password and login preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
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
            <CardTitle>Account Security</CardTitle>
            <CardDescription>
              Manage your password and login preferences
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Lock className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {hasPassword ? "Change Password" : "Set Password"}
                </DialogTitle>
                <DialogDescription>
                  {hasPassword
                    ? "Update your password to secure your account."
                    : "Set a password to enable traditional email/password login."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {hasPassword && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="currentPassword" className="text-right">
                        Current Password
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={formData.currentPassword}
                        placeholder="Enter current password"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newPassword" className="text-right">
                      {hasPassword ? "New Password" : "Password"}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      placeholder={
                        hasPassword ? "Enter new password" : "Enter password"
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newPassword: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmPassword" className="text-right">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      placeholder="Confirm password"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      isLoading ||
                      !formData.newPassword ||
                      (hasPassword && !formData.currentPassword)
                    }
                  >
                    {isLoading ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Password Status
            </p>
            <p className="text-lg">
              {hasPassword
                ? "Password enabled"
                : "No password set (Magic Link only)"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
