/**
 * AccountSettingsForm: reusable form for name, email, and optional password change. Used by profile and admin settings pages.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { updateUser } from "@/lib/api/users";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, CardContent, Input, Label } from "@ui/components";
import type { AuthUser } from "@/contexts/AuthContext";

export interface AccountSettingsFormProps {
  /** Current user; form is disabled when null. */
  user: AuthUser | null;
  /** Called after a successful update with the new name, email, and username (e.g. to sync auth context). */
  onSuccess?: (data: { name: string; email: string; username?: string }) => void;
  /** Optional id prefix for form fields to avoid duplicate ids when multiple instances exist. */
  idPrefix?: string;
}

/** Renders a vertical account form (name, email, optional new password) with a centered Save changes button. */
export function AccountSettingsForm({
  user,
  onSuccess,
  idPrefix = "settings",
}: AccountSettingsFormProps) {
  const [accountName, setAccountName] = useState(user?.name ?? "");
  const [accountEmail, setAccountEmail] = useState(user?.email ?? "");
  const [accountUsername, setAccountUsername] = useState(user?.username ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setAccountName(user.name);
      setAccountEmail(user.email);
      setAccountUsername(user.username ?? "");
    }
  }, [user?.id, user?.name, user?.email, user?.username]);

  const accountMutation = useMutation({
    mutationFn: (payload: { name?: string; email?: string; username?: string; password?: string }) =>
      user ? updateUser(user.id, payload) : Promise.reject(new Error("Not signed in")),
    onSuccess: (data) => {
      onSuccess?.({ name: data.name, email: data.email, username: data.username });
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const handleSave = useCallback(() => {
    const name = accountName.trim();
    const email = accountEmail.trim();
    if (!name || !email) return;
    const payload: { name?: string; email?: string; username?: string; password?: string } = {
      name,
      email,
      username: accountUsername.trim() || undefined,
    };
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8 || newPassword !== confirmPassword) return;
      payload.password = newPassword;
    }
    accountMutation.mutate(payload);
  }, [accountName, accountEmail, accountUsername, newPassword, confirmPassword, accountMutation]);

  const nameId = `${idPrefix}-account-name`;
  const emailId = `${idPrefix}-account-email`;
  const usernameId = `${idPrefix}-account-username`;
  const newPwId = `${idPrefix}-new-password`;
  const confirmPwId = `${idPrefix}-confirm-password`;

  return (
    <Card variant="default" className="border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Your name"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={usernameId}>Username (optional)</Label>
            <Input
              id={usernameId}
              value={accountUsername}
              onChange={(e) => setAccountUsername(e.target.value)}
              placeholder="3–30 chars, letters, numbers, _ -"
              className="w-full"
              autoComplete="username"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={newPwId}>New password (optional)</Label>
            <Input
              id={newPwId}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full"
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={confirmPwId}>Confirm new password</Label>
            <Input
              id={confirmPwId}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full"
              autoComplete="new-password"
            />
          </div>
        </div>
        {accountMutation.isError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {accountMutation.error instanceof Error
              ? accountMutation.error.message
              : "Failed to update account"}
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={accountMutation.isPending || !user}
          >
            {accountMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
