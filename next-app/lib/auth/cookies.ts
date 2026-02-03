/**
 * Helpers for the refresh token cookie: set it on login/refresh, clear it on logout, read it for refresh. HttpOnly so JS cannot read it (safer).
 */

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const REFRESH_MAX_AGE_DAYS = 7;

/** Options used when setting the refresh cookie (path, httpOnly, secure, etc.). */
export function getRefreshCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE_DAYS * 24 * 60 * 60,
  };
}

/** Builds the Set-Cookie header string for the refresh token (used on login/refresh). */
export function buildSetCookieHeader(value: string): string {
  const opts = getRefreshCookieOptions();
  const parts = [
    `${REFRESH_COOKIE_NAME}=${value}`,
    `Path=${opts.path}`,
    `HttpOnly`,
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Builds the Set-Cookie header to clear the refresh cookie (used on logout). */
export function buildClearCookieHeader(): string {
  return [
    `${REFRESH_COOKIE_NAME}=`,
    "Path=" + REFRESH_COOKIE_PATH,
    "HttpOnly",
    "SameSite=lax",
    "Max-Age=0",
  ].join("; ");
}

/** Reads the refresh token from the request's Cookie header (used by the refresh endpoint). */
export function getRefreshTokenFromCookie(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1].trim()) : null;
}
