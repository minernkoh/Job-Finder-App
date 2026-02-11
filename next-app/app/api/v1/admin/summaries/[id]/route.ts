/**
 * Admin summary by ID API: DELETE removes a summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteSummary } from "@/lib/services/admin-summaries.service";
import { withAdmin } from "@/lib/api/with-auth";

async function deleteAdminSummaryHandler(
  _request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const deleted = await deleteSummary(id);
  if (!deleted) {
    return NextResponse.json(
      { success: false, message: "Summary not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: { id } });
}

export const DELETE = withAdmin(
  deleteAdminSummaryHandler,
  "Failed to delete summary"
);
