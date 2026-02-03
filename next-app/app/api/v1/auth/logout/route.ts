/**
 * Logout API: clears the refresh token cookie so the user is logged out. Returns success envelope per .cursorrules.
 */

import { NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/lib/auth/cookies";

/** Clears the refresh cookie and returns success. Call this when the user clicks Logout. */
export async function POST() {
  const headers = new Headers();
  headers.set("Set-Cookie", buildClearCookieHeader());
  return NextResponse.json({ success: true, data: { ok: true } }, { headers });
}
