/**
 * Password strength helper: returns a 0–3 score for UI (empty, weak, medium, strong) without level-3 ternaries.
 */

export type PasswordStrengthScore = 0 | 1 | 2 | 3;

/**
 * Returns password strength score: 0 empty, 1 weak (length < 8), 2 medium, 3 strong (length >= 8 + uppercase + digit).
 */
export function getPasswordStrength(password: string): PasswordStrengthScore {
  if (password.length === 0) return 0;
  if (password.length < 8) return 1;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 3;
  return 2;
}
