/**
 * AccountSettingsForm: reusable form for email, username, and optional password change. Used by profile and admin settings pages.
 */

"use client";

import { toast } from "sonner";
import { useState, useCallback } from "react";
import { updateUser } from "@/lib/api/users";
import {
  validatePassword,
  validateUsername,
} from "@/lib/validation";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, CardContent, Input } from "@ui/components";
import { FormField } from "@/components/form-field";
import { InlineError } from "@/components/page-state";
import { CARD_PADDING_COMPACT, GAP_MD } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";
import type { AuthUser } from "@/contexts/AuthContext";

export interface AccountSettingsFormProps {
  /** Current user; form is disabled when null. */
  user: AuthUser | null;
  /** Called after a successful update with the new email and username (e.g. to sync auth context). */
  onSuccess?: (data: { email: string; username: string }) => void;
  /** Optional id prefix for form fields to avoid duplicate ids when multiple instances exist. */
  idPrefix?: string;
}

/** Inner form content; keyed by user.id so state resets when user changes. */
function AccountSettingsFormInner({
  user,
  onSuccess,
  idPrefix,
}: {
  user: AuthUser;
  onSuccess?: (data: { email: string; username: string }) => void;
  idPrefix: string;
}) {
  const [accountEmail, setAccountEmail] = useState(user.email);
  const [accountUsername, setAccountUsername] = useState(user.username ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const accountMutation = useMutation({
    mutationFn: (payload: {
      email?: string;
      username?: string;
      password?: string;
    }) =>
      user
        ? updateUser(user.id, payload)
        : Promise.reject(new Error("Not signed in")),
    onSuccess: (data) => {
      onSuccess?.({ email: data.email, username: data.username });
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Account updated");
    },
  });

  const handleSave = useCallback(() => {
    const email = accountEmail.trim();
    if (!email) return;
    const usernameResult = validateUsername(accountUsername);
    if (!usernameResult.valid) {
      toast.error(usernameResult.error ?? "Invalid username");
      return;
    }
    const payload: { email?: string; username?: string; password?: string } = {
      email,
      username: accountUsername.trim(),
    };
    if (newPassword || confirmPassword) {
      const passwordResult = validatePassword(newPassword);
      if (!passwordResult.valid) {
        toast.error(passwordResult.error ?? "Invalid password");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      payload.password = newPassword;
    }
    accountMutation.mutate(payload);
  }, [
    accountEmail,
    accountUsername,
    newPassword,
    confirmPassword,
    accountMutation,
  ]);

  const emailId = `${idPrefix}-account-email`;
  const usernameId = `${idPrefix}-account-username`;
  const newPwId = `${idPrefix}-new-password`;
  const confirmPwId = `${idPrefix}-confirm-password`;

  return (
    <Card variant="default" className="border-border">
      <CardContent className={CARD_PADDING_COMPACT}>
        <div className={cn("flex flex-col", GAP_MD)}>
          <FormField id={usernameId} label="Username">
            <Input
              id={usernameId}
              value={accountUsername}
              onChange={(e) => setAccountUsername(e.target.value)}
              placeholder="3–30 chars, letters, numbers, _ -"
              className="w-full"
              minLength={3}
              maxLength={30}
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground">
              Used to sign in and identify you.
            </p>
          </FormField>
          <FormField id={emailId} label="Email">
            <Input
              id={emailId}
              type="email"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full"
            />
          </FormField>
          <FormField id={newPwId} label="New password (optional)">
            <Input
              id={newPwId}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full"
              autoComplete="new-password"
            />
          </FormField>
          <FormField id={confirmPwId} label="Confirm new password">
            <Input
              id={confirmPwId}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full"
              autoComplete="new-password"
            />
          </FormField>
        </div>
        {accountMutation.isError && (
          <div className="mt-4">
            <InlineError
              message={
                accountMutation.error instanceof Error
                  ? accountMutation.error.message
                  : "Failed to update account"
              }
            />
          </div>
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

/** Renders a vertical account form (email, username, optional new password) with a centered Save changes button. */
export function AccountSettingsForm({
  user,
  onSuccess,
  idPrefix = "settings",
}: AccountSettingsFormProps) {
  if (!user) {
    return (
      <Card variant="default" className="border-border">
        <CardContent className={CARD_PADDING_COMPACT}>
          <p className="text-sm text-muted-foreground">
            Sign in to update your account.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <AccountSettingsFormInner
      key={user.id}
      user={user}
      onSuccess={onSuccess}
      idPrefix={idPrefix}
    />
  );
}
