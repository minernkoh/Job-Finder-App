/**
 * Admin analytics API: GET returns user growth, summary stats, popular listings, word cloud, AI/JD metrics. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getAnalytics } from "@/lib/services/admin-analytics.service";
import { toErrorResponse } from "@/lib/api/errors";

/** Returns analytics payload for the admin analytics dashboard. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const data = await getAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Analytics unavailable");
  }
}
