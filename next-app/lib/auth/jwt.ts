/**
 * JWT helpers: sign and verify access tokens (short-lived) and refresh tokens (long-lived). Used by auth routes and guards.
 */

import * as jose from "jose";
import { getEnv } from "../env";

export interface AccessPayload {
  sub: string;
  email: string;
  role: "admin" | "user";
}

export interface RefreshPayload {
  sub: string;
}

/** Creates a short-lived access token (returned in JSON; client sends it as Bearer). */
export async function signAccessToken(payload: AccessPayload): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TOKEN_EXPIRES_IN)
    .sign(secret);
}

/** Creates a long-lived refresh token (stored in HttpOnly cookie; used to get a new access token). */
export async function signRefreshToken(
  payload: RefreshPayload
): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
  return new jose.SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TOKEN_EXPIRES_IN)
    .sign(secret);
}

/** Verifies an access token and returns the payload (userId, email, role) or null if invalid/expired. */
export async function verifyAccessToken(
  token: string
): Promise<AccessPayload | null> {
  try {
    const env = getEnv();
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as "admin" | "user",
    };
  } catch {
    return null;
  }
}

/** Verifies a refresh token and returns the payload (userId) or null if invalid/expired. */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshPayload | null> {
  try {
    const env = getEnv();
    const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}
