/**
 * GET /api/v1/listings/:id: fetch one listing. PATCH/DELETE: update or delete (admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { ListingUpdateSchema } from "@schemas";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/guard";
import {
  deleteListingById,
  getListingById,
  updateListingById,
} from "@/lib/services/listings.service";

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

/** Updates a listing (admin only). Returns 200 with updated listing or 404. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Listing id required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = ListingUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

    const listing = await updateListingById(id, parsed.data);
    if (!listing) {
      return NextResponse.json(
        { success: false, message: "Listing not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: listing });
  } catch (err) {
    return toErrorResponse(err, "Failed to update listing");
  }
}

/** Deletes a listing (admin only). Returns 204 on success or 404 if not found. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Listing id required" },
        { status: 400 }
      );
    }

    const deleted = await deleteListingById(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Listing not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err, "Failed to delete listing");
  }
}
