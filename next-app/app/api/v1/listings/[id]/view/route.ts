/**
 * POST /api/v1/listings/:id/view: record a view/click for a listing. Public, no auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { recordView } from "@/lib/services/listing-views.service";

export async function POST(
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
    await recordView(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Failed to record view");
  }
}
