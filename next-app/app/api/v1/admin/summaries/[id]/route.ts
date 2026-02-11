/**
 * Admin summary by ID API: DELETE removes a summary. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { deleteSummary } from "@/lib/services/admin-summaries.service";
import { toErrorResponse } from "@/lib/api/errors";

/** Deletes a summary by id. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    const deleted = await deleteSummary(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Summary not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: { id } });
  } catch (e) {
    return toErrorResponse(e, "Failed to delete summary");
  }
}
