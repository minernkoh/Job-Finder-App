/**
 * Admin user status API: PATCH updates user status (active/suspended). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUserStatusBodySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { updateUserStatus } from "@/lib/services/admin-users.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Updates user status (active | suspended). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    const body = await request.json();
    const parsed = AdminUserStatusBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const updateResult = await updateUserStatus(id, parsed.data.status);
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, message: updateResult.reason },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { id, status: parsed.data.status },
    });
  } catch (e) {
    return toErrorResponse(e, "Failed to update status");
  }
}
