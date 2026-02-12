/**
 * Admin guard: requires authenticated user with admin role. Uses request.requireAuth and returns consistent error shape.
 * Also provides requireOwnOrAdmin for user-by-id routes (own profile or admin).
 */

import { NextRequest, NextResponse } from "next/server";
import type { AccessPayload } from "./jwt";
import { requireAuth } from "./request";

/** Returns 401 or 403 NextResponse if not authorized; otherwise returns { payload }. Uses same error shape as rest of API: { success: false, message }. */
export async function requireAdmin(
  request: NextRequest
): Promise<{ payload: AccessPayload } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
  return { payload: result };
}

/** Returns 403 NextResponse if payload is not the resource owner and not admin; otherwise returns null (allowed). */
export function requireOwnOrAdmin(
  payload: { sub: string; role: string },
  resourceUserId: string
): NextResponse | null {
  const isOwn = payload.sub === resourceUserId;
  const isAdmin = payload.role === "admin";
  if (!isOwn && !isAdmin) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }
  return null;
}
