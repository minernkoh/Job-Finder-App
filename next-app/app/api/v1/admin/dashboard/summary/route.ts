/**
 * Admin dashboard summary API: returns only the AI-generated narrative summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummaryOnly } from "@/lib/services/admin-dashboard.service";
import { withAdmin } from "@/lib/api/with-auth";

/** Returns dashboard summary only; 403 for non-admin. Supports ?refresh=1 to bypass cache. */
async function getSummaryHandler(
  request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
  const url = new URL(request.url);
  const skipCache = url.searchParams.get("refresh") === "1";

  const summary = await getDashboardSummaryOnly({ skipCache });

  return NextResponse.json({
    success: true,
    data: { summary },
  });
}

export const GET = withAdmin(getSummaryHandler, "Summary unavailable");
