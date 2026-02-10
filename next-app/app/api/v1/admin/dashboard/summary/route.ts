/**
 * Admin dashboard summary API: returns only the AI-generated narrative summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getDashboardSummaryOnly } from "@/lib/services/admin-dashboard.service";

/** Returns dashboard summary only; 403 for non-admin. Supports ?refresh=1 to bypass cache. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const url = new URL(request.url);
    const skipCache = url.searchParams.get("refresh") === "1";

    const summary = await getDashboardSummaryOnly({ skipCache });

    return NextResponse.json({
      success: true,
      data: { summary },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Summary unavailable" },
      { status: 500 }
    );
  }
}
