/**
 * Shared validation helpers for username and password. Single source of truth for auth and account forms.
 */

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = username.trim();
  if (trimmed.length < 3)
    return { valid: false, error: "Username must be at least 3 characters" };
  if (!USERNAME_REGEX.test(trimmed))
    return {
      valid: false,
      error:
        "Username may only contain letters, numbers, underscore, and hyphen",
    };
  return { valid: true };
}

export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8)
    return { valid: false, error: "Password must be at least 8 characters" };
  return { valid: true };
}
