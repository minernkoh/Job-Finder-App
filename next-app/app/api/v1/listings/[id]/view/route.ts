/**
 * POST /api/v1/listings/:id/view: record a view/click for a listing. Public, no auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { isValidObjectId } from "@/lib/objectid";
import { recordView } from "@/lib/services/listing-views.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Listing id required" },
        { status: 400 }
      );
    }
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid listing id" },
        { status: 400 }
      );
    }
    await recordView(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Failed to record view");
  }
}
