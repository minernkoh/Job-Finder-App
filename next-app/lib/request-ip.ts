/**
 * Client IP from proxy headers (Vercel x-forwarded-for). Used for guest preview AI quotas.
 */

import type { NextRequest } from "next/server";

/** Returns the best-effort client IP, or "unknown" when none is present. */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
