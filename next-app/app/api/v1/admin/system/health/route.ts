/**
 * Admin system health API: GET returns DB and optional service health. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getSystemHealth } from "@/lib/services/admin-system.service";
import { toErrorResponse } from "@/lib/api/errors";

/** Returns system health (e.g. DB ping). */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const data = await getSystemHealth();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Health check failed");
  }
}
