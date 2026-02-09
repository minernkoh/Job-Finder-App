/**
 * Shared auth form fields: email, password for login; name, username (optional), email, password for signup.
 * Parent owns state and submit handler. Used by auth-modal and admin page.
 */

"use client";

import { Input, Label } from "@ui/components";
import { PasswordInput } from "@/components/password-input";
import { getPasswordStrength } from "@/lib/password-strength";

interface AuthFormFieldsProps {
  mode: "login" | "signup";
  idPrefix: string;
  email: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  password: string;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  onNameChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  username?: string;
  onUsernameChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/** Renders login (email, password) or signup (name, username optional, email, password) form fields. */
export function AuthFormFields({
  mode,
  idPrefix,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  name = "",
  onNameChange,
  username = "",
  onUsernameChange,
  disabled = false,
}: AuthFormFieldsProps) {
  const p = idPrefix;
  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : 0;

  return (
    <>
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor={`${p}name`}>Name</Label>
          <Input
            id={`${p}name`}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={onNameChange ?? (() => {})}
            required
            autoComplete="name"
            disabled={disabled}
          />
        </div>
      )}
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor={`${p}username`}>Username (optional)</Label>
          <Input
            id={`${p}username`}
            type="text"
            placeholder="3–30 chars, letters, numbers, _ -"
            value={username}
            onChange={onUsernameChange ?? (() => {})}
            autoComplete="username"
            disabled={disabled}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${p}email`}>Email</Label>
        <Input
          id={`${p}email`}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={onEmailChange}
          required
          autoComplete="email"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${p}password`}>Password</Label>
        <PasswordInput
          id={`${p}password`}
          value={password}
          onChange={onPasswordChange}
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={disabled}
        />
        {mode === "signup" && password.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Strength:{" "}
            {passwordStrength === 1 && "Weak (min 8 characters)"}
            {passwordStrength === 2 && "Medium (add uppercase and number)"}
            {passwordStrength === 3 && "Strong"}
          </p>
        )}
      </div>
    </>
  );
}
