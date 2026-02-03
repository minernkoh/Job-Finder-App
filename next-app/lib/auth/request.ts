/**
 * Request-level auth: reads the Bearer token from the request and verifies it. Used by protected and admin-only API routes.
 */

import type { NextRequest } from "next/server";
import type { AccessPayload } from "./jwt";
import { verifyAccessToken } from "./jwt";

const BEARER_PREFIX = "Bearer ";

/**
 * Extracts and verifies the access token from the request's Authorization header.
 * Returns the payload (userId as sub, email, role) or null if missing or invalid.
 */
export async function getPayloadFromRequest(
  request: NextRequest
): Promise<AccessPayload | null> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith(BEARER_PREFIX)) return null;
  const token = auth.slice(BEARER_PREFIX.length).trim();
  if (!token) return null;
  return verifyAccessToken(token);
}
