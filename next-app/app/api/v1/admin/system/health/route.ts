/**
 * Admin system health API: GET returns DB and optional service health. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/services/admin-system.service";
import { withAdmin } from "@/lib/api/with-auth";

async function getHealthHandler(
  _request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
  const data = await getSystemHealth();
  return NextResponse.json({ success: true, data });
}

export const GET = withAdmin(getHealthHandler, "Health check failed");
