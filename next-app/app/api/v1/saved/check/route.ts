/**
 * GET /api/v1/saved/check?listingId=xxx: check if current user has saved a listing. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { isListingSaved } from "@/lib/services/saved-listings.service";

async function getCheckHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const listingId = request.nextUrl.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json(
      { success: false, message: "listingId query required" },
      { status: 400 }
    );
  }
  const saved = await isListingSaved(payload.sub, listingId);
  return NextResponse.json({ success: true, data: { saved } });
}

export const GET = withAuth(getCheckHandler, "Failed to check saved status");
