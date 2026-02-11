/**
 * Admin user status API: PATCH updates user status (active/suspended). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUserStatusBodySchema } from "@schemas";
import { updateUserStatus } from "@/lib/services/admin-users.service";
import { parseJsonBody, validateIdParam, validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";

async function patchStatusHandler(
  request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "user id");
  if (idErr) return idErr;
  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = AdminUserStatusBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
  const updateResult = await updateUserStatus(id!, parsed.data.status);
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
}

export const PATCH = withAdmin(patchStatusHandler, "Failed to update status");
