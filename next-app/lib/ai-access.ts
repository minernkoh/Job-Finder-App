/**
 * Client-safe helpers for preview vs AI-unlocked access. No server-only imports.
 */

export const AI_LOCKED_CODE = "AI_LOCKED";
export const AI_LOCKED_MESSAGE =
  "AI features are invite-only. Unlock them in Settings with an access code.";

export const AI_QUOTA_MESSAGE =
  "Daily AI quota reached. Try again tomorrow, or reuse a cached result.";

/** Returns true when the user may call Gemini-backed features. Admins are always unlocked. */
export function userHasAiAccess(
  user: { role: string; aiEnabled?: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  return user.role === "admin" || Boolean(user.aiEnabled);
}
