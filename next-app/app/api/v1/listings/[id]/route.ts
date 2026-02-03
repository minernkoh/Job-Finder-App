/**
 * GET /api/v1/listings/:id: fetch a single listing by id. Returns 404 if not found in cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { getListingById } from "@/lib/services/listings.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Listing id required" },
        { status: 400 }
      );
    }

    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json(
        { success: false, message: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: listing });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch listing");
  }
}
