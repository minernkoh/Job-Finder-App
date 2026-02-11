/**
 * GET /api/v1/summaries/:id: return one summary (own only). DELETE: delete own summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import {
  getSummaryByIdForUser,
  deleteSummary,
} from "@/lib/services/summaries.service";

async function getSummaryByIdHandler(
  _request: NextRequest,
  payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
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
}

async function deleteSummaryHandler(
  _request: NextRequest,
  payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
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
}

export const GET = withAuth(getSummaryByIdHandler, "Failed to fetch summary");
export const DELETE = withAuth(deleteSummaryHandler, "Failed to delete summary");
