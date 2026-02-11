/**
 * Admin user role API: PATCH updates user role (promote/demote). Prevents demoting last admin. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUserRoleBodySchema } from "@schemas";
import { updateUserRole } from "@/lib/services/admin-users.service";
import { parseJsonBody, validateIdParam, validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";

async function patchRoleHandler(
  request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "user id");
  if (idErr) return idErr;
  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = AdminUserRoleBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
  const updateResult = await updateUserRole(id!, parsed.data.role);
  if (!updateResult.success) {
    return NextResponse.json(
      { success: false, message: updateResult.reason },
      { status: 400 }
    );
  }
  return NextResponse.json({
    success: true,
    data: { id, role: parsed.data.role },
  });
}

export const PATCH = withAdmin(patchRoleHandler, "Failed to update role");
