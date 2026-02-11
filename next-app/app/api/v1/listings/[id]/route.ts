/**
 * GET /api/v1/listings/:id: fetch one listing. PATCH/DELETE: update or delete (admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { ListingUpdateSchema } from "@schemas";
import { parseJsonBody, toErrorResponse, validateIdParam, validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";
import { connectDB } from "@/lib/db";
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
    await connectDB();
    const { id } = await params;
    const idErr = validateIdParam(id, "listing id");
    if (idErr) return idErr;
    const listing = await getListingById(id!);
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

async function patchListingHandler(
  request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "listing id");
  if (idErr) return idErr;
  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = ListingUpdateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  const listing = await updateListingById(id!, parsed.data);
  if (!listing) {
    return NextResponse.json(
      { success: false, message: "Listing not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: listing });
}

async function deleteListingHandler(
  _request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "listing id");
  if (idErr) return idErr;
  const deleted = await deleteListingById(id!);
  if (!deleted) {
    return NextResponse.json(
      { success: false, message: "Listing not found" },
      { status: 404 }
    );
  }
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withAdmin(patchListingHandler, "Failed to update listing");
export const DELETE = withAdmin(deleteListingHandler, "Failed to delete listing");
