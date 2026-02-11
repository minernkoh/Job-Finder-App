/**
 * Shared auth form fields: for login, email or username + password; for signup, username (required), email, password.
 * Parent owns state and submit handler. Used by auth-modal and admin page.
 */

"use client";

import { Input } from "@ui/components";
import { FormField } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { getPasswordStrength } from "@/lib/password-strength";
import { USERNAME_REGEX } from "@/lib/validation";

interface AuthFormFieldsProps {
  mode: "login" | "signup";
  idPrefix: string;
  email: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  password: string;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  username?: string;
  onUsernameChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** Field-level validation errors from API (e.g. Zod flatten fieldErrors). */
  usernameError?: string;
  emailError?: string;
  passwordError?: string;
}

/** Re-export for consumers that still import from here. Defined in @/lib/validation. */
export { USERNAME_REGEX };

/** Renders login (email or username, password) or signup (username required, email, password) form fields. */
export function AuthFormFields({
  mode,
  idPrefix,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  username = "",
  onUsernameChange,
  disabled = false,
  usernameError,
  emailError,
  passwordError,
}: AuthFormFieldsProps) {
  const p = idPrefix;
  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : 0;

  return (
    <>
      {mode === "signup" && (
        <FormField
          id={`${p}username`}
          label="Username"
          error={usernameError}
          required
        >
          <Input
            id={`${p}username`}
            type="text"
            placeholder="3–30 chars, letters, numbers, _ -"
            value={username}
            onChange={onUsernameChange ?? (() => {})}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Letters, numbers, underscore, and hyphen only"
            autoComplete="username"
            disabled={disabled}
          />
        </FormField>
      )}
      <FormField
        id={`${p}email`}
        label={mode === "login" ? "Email or username" : "Email"}
        error={emailError}
        required
      >
        <Input
          id={`${p}email`}
          type={mode === "login" ? "text" : "email"}
          placeholder={mode === "login" ? "Email or username" : "you@example.com"}
          value={email}
          onChange={onEmailChange}
          required
          autoComplete={mode === "login" ? "username" : "email"}
          disabled={disabled}
        />
      </FormField>
      <FormField
        id={`${p}password`}
        label="Password"
        error={passwordError}
        required
      >
        <PasswordInput
          id={`${p}password`}
          value={password}
          onChange={onPasswordChange}
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={disabled}
        />
        {mode === "signup" && password.length > 0 && !passwordError && (
          <p className="text-xs text-muted-foreground">
            Strength:{" "}
            {passwordStrength === 1 && "Weak (min 8 characters)"}
            {passwordStrength === 2 && "Medium (add uppercase and number)"}
            {passwordStrength === 3 && "Strong"}
          </p>
        )}
      </FormField>
    </>
  );
}
