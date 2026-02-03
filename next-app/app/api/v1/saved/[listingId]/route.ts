/**
 * DELETE /api/v1/saved/:listingId: unsave a listing for the current user. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse } from "@/lib/api/errors";
import { unsaveListing } from "@/lib/services/saved-listings.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;
  try {
    const { listingId } = await params;
    if (!listingId) {
      return NextResponse.json(
        { success: false, message: "Listing id required" },
        { status: 400 }
      );
    }
    const removed = await unsaveListing(payload.sub, listingId);
    if (!removed) {
      return NextResponse.json(
        { success: false, message: "Saved listing not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Failed to unsave listing");
  }
}
