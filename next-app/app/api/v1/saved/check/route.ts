/**
 * GET /api/v1/saved/check?listingId=xxx: check if current user has saved a listing. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse } from "@/lib/api/errors";
import { isListingSaved } from "@/lib/services/saved-listings.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;
  const listingId = request.nextUrl.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json(
      { success: false, message: "listingId query required" },
      { status: 400 }
    );
  }
  try {
    const saved = await isListingSaved(payload.sub, listingId);
    return NextResponse.json({ success: true, data: { saved } });
  } catch (err) {
    return toErrorResponse(err, "Failed to check saved status");
  }
}
