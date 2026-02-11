/**
 * DELETE /api/v1/saved/:listingId: unsave a listing for the current user. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateIdParam } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { unsaveListing } from "@/lib/services/saved-listings.service";

async function deleteSavedHandler(
  _request: NextRequest,
  payload: { sub: string },
  context: { params: Promise<{ listingId: string }> }
): Promise<NextResponse> {
  const { listingId } = await context.params;
  const idErr = validateIdParam(listingId, "listing id");
  if (idErr) return idErr;
  const removed = await unsaveListing(payload.sub, listingId!);
  if (!removed) {
    return NextResponse.json(
      { success: false, message: "Saved listing not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}

export const DELETE = withAuth(
  deleteSavedHandler,
  "Failed to unsave listing"
);
