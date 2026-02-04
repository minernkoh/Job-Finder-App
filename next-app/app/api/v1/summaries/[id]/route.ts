/**
 * GET /api/v1/summaries/:id: return one summary (own only). DELETE: delete own summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse } from "@/lib/api/errors";
import {
  getSummaryByIdForUser,
  deleteSummary,
} from "@/lib/services/summaries.service";

/** Returns summary if found and owned by requester; 404 otherwise. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Summary id required" },
        { status: 400 }
      );
    }

    const summary = await getSummaryByIdForUser(payload.sub, id);
    if (!summary) {
      return NextResponse.json(
        { success: false, message: "Summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch summary");
  }
}

/** Deletes summary if owned by requester; 404 if not found or not owner. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Summary id required" },
        { status: 400 }
      );
    }

    const deleted = await deleteSummary(payload.sub, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Summary not found or not yours" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Failed to delete summary");
  }
}
