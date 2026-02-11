/**
 * Admin dashboard API: returns aggregated metrics and an AI-generated narrative summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminDashboardResponseSchema } from "@schemas";
import {
  getDashboardWithSummary,
  getDashboardWithoutSummary,
} from "@/lib/services/admin-dashboard.service";
import { withAdmin } from "@/lib/api/with-auth";

/** Returns dashboard metrics and optionally AI summary; 403 for non-admin. Use ?includeSummary=0 for fast load without summary; ?refresh=1 bypasses summary cache when summary is included. */
async function getDashboardHandler(
  request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
  const url = new URL(request.url);
  const includeSummary = url.searchParams.get("includeSummary") !== "0";
  const skipCache = url.searchParams.get("refresh") === "1";

  const data = includeSummary
    ? await getDashboardWithSummary({ skipCache })
    : await getDashboardWithoutSummary();
  const parsed = AdminDashboardResponseSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid dashboard response" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: parsed.data,
  });
}

export const GET = withAdmin(getDashboardHandler, "Dashboard unavailable");
