/**
 * Admin user by ID API: GET returns user detail with activity counts; PATCH updates email/username; DELETE removes user (with safeguards). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUpdateUserBodySchema } from "@schemas";
import {
  getUserDetail,
  deleteUser,
  updateUserProfile,
} from "@/lib/services/admin-users.service";
import { parseJsonBody, validateIdParam, validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";

async function getAdminUserHandler(
  _request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "user id");
  if (idErr) return idErr;
  const data = await getUserDetail(id!);
  if (!data) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data });
}

async function patchAdminUserHandler(
  request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "user id");
  if (idErr) return idErr;
  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = AdminUpdateUserBodySchema.safeParse(body);
  if (!parsed.success)
    return validationErrorResponse(parsed.error, "Invalid input");
  const data = parsed.data;
  if (data.email === undefined && data.username === undefined) {
    return NextResponse.json(
      { success: false, message: "Provide email and/or username to update" },
      { status: 400 },
    );
  }
  const outcome = await updateUserProfile(id!, data);
  if (!outcome.success) {
    return NextResponse.json(
      { success: false, message: outcome.reason },
      { status: 409 },
    );
  }
  const updated = await getUserDetail(id!);
  return NextResponse.json({ success: true, data: updated });
}

async function deleteAdminUserHandler(
  _request: NextRequest,
  _payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const idErr = validateIdParam(id, "user id");
  if (idErr) return idErr;
  const deleteResult = await deleteUser(id!);
  if (!deleteResult.success) {
    return NextResponse.json(
      { success: false, message: deleteResult.reason },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true, data: { id } });
}

export const GET = withAdmin(getAdminUserHandler, "Failed to get user");
export const PATCH = withAdmin(patchAdminUserHandler, "Failed to update user");
export const DELETE = withAdmin(deleteAdminUserHandler, "Failed to delete user");
