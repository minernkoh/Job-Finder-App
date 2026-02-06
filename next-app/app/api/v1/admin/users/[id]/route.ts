/**
 * Admin user by ID API: GET returns user detail with activity counts; DELETE removes user (with safeguards). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getUserDetail, deleteUser } from "@/lib/services/admin-users.service";
import { logAudit } from "@/lib/services/audit.service";
import { toErrorResponse } from "@/lib/api/errors";

/** Returns user detail with summary count, saved count, last activity. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    const data = await getUserDetail(id);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to get user");
  }
}

/** Deletes user and related data; prevents self-delete and deleting last admin. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { payload } = result;
    const { id } = await params;
    const deleteResult = await deleteUser(id, payload.sub);
    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, message: deleteResult.reason },
        { status: 400 }
      );
    }
    await logAudit(request, payload, {
      action: "delete",
      resourceType: "user",
      resourceId: id,
      details: { deletedUserId: id },
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (e) {
    return toErrorResponse(e, "Failed to delete user");
  }
}
