/**
 * Admin guard: requires authenticated user with admin role. Uses request.requireAuth and returns consistent error shape.
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
