/**
 * Admin user by ID API: GET returns user detail with activity counts; PATCH updates email/username; DELETE removes user (with safeguards). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUpdateUserBodySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getUserDetail,
  deleteUser,
  updateUserProfile,
} from "@/lib/services/admin-users.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns user detail with summary count, saved count, last activity. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    const data = await getUserDetail(id);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to get user");
  }
}

/** Updates user email and/or username. Returns updated user on success. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;
    const body = await request.json();
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
    const outcome = await updateUserProfile(id, data);
    if (!outcome.success) {
      return NextResponse.json(
        { success: false, message: outcome.reason },
        { status: 409 },
      );
    }
    const updated = await getUserDetail(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return toErrorResponse(e, "Failed to update user");
  }
}

/** Deletes user and related data; prevents self-delete and deleting last admin. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const deleteResult = await deleteUser(id);
    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, message: deleteResult.reason },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, data: { id } });
  } catch (e) {
    return toErrorResponse(e, "Failed to delete user");
  }
}
