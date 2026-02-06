/**
 * Admin dashboard API: returns aggregated metrics and an AI-generated narrative summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminDashboardResponseSchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { getDashboardWithSummary } from "@/lib/services/admin-dashboard.service";

/** Returns dashboard metrics and AI summary; 403 for non-admin. Supports ?refresh=1 to bypass summary cache. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;

    const url = new URL(request.url);
    const skipCache = url.searchParams.get("refresh") === "1";

    const data = await getDashboardWithSummary({ skipCache });
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
  } catch (e) {
    console.error("Admin dashboard error:", e);
    return NextResponse.json(
      { success: false, message: "Dashboard unavailable" },
      { status: 500 }
    );
  }
}
