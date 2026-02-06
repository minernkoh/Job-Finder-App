/**
 * Admin user role API: PATCH updates user role (promote/demote). Prevents demoting last admin. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUserRoleBodySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { updateUserRole } from "@/lib/services/admin-users.service";
import { logAudit } from "@/lib/services/audit.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Updates user role; returns 400 if demoting last admin. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { payload } = result;
    const { id } = await params;
    const body = await request.json();
    const parsed = AdminUserRoleBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const updateResult = await updateUserRole(id, parsed.data.role);
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, message: updateResult.reason },
        { status: 400 }
      );
    }
    await logAudit(request, payload, {
      action: "update_role",
      resourceType: "user",
      resourceId: id,
      details: { role: parsed.data.role },
    });
    return NextResponse.json({
      success: true,
      data: { id, role: parsed.data.role },
    });
  } catch (e) {
    return toErrorResponse(e, "Failed to update role");
  }
}
