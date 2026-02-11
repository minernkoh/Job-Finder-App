/**
 * User by ID API: GET returns one user (own profile or admin); PATCH updates user (own profile or admin); DELETE removes own account (cascade).
 */

import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import { UserUpdateSchema } from "@schemas";
import { parseJsonBody, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { isValidObjectId } from "@/lib/objectid";
import { deleteUser } from "@/lib/services/admin-users.service";
import { serializeUser } from "@/lib/user-serializer";

async function getUserIdHandler(
  _request: NextRequest,
  payload: { sub: string; role: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const isOwn = payload.sub === id;
  const isAdmin = payload.role === "admin";
  if (!isOwn && !isAdmin) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid user id" },
      { status: 400 },
    );
  }

  const user = await User.findById(id).select("-password").lean();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: serializeUser(user),
  });
}

async function patchUserIdHandler(
  request: NextRequest,
  payload: { sub: string; role: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const isOwn = payload.sub === id;
  const isAdmin = payload.role === "admin";
  if (!isOwn && !isAdmin) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid user id" },
      { status: 400 },
    );
  }

  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success)
    return validationErrorResponse(parsed.error, "Invalid input");

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  if (parsed.data.email !== undefined) {
    const existing = await User.findOne({
      email: parsed.data.email,
      role: user.role,
    }).lean();
    if (existing && existing._id.toString() !== id) {
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 409 },
      );
    }
    user.email = parsed.data.email;
  }
  if (parsed.data.username !== undefined) {
    const trimmed = parsed.data.username.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          success: false,
          message: "Username is required and cannot be cleared",
        },
        { status: 400 },
      );
    }
    const existingByUsername = await User.findOne({
      username: trimmed,
      _id: { $ne: id },
    }).lean();
    if (existingByUsername) {
      return NextResponse.json(
        { success: false, message: "Username already taken" },
        { status: 409 },
      );
    }
    user.username = trimmed;
  }
  if (parsed.data.password !== undefined)
    user.password = parsed.data.password;

  await user.save();

  const updated = await User.findById(id).select("-password").lean();
  return NextResponse.json({
    success: true,
    data: serializeUser(updated!),
  });
}

async function deleteUserIdHandler(
  _request: NextRequest,
  payload: { sub: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (payload.sub !== id) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid user id" },
      { status: 400 },
    );
  }

  const deleteResult = await deleteUser(id);
  if (!deleteResult.success) {
    return NextResponse.json(
      { success: false, message: deleteResult.reason },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true, data: { id } });
}

export const GET = withAuth(getUserIdHandler, "Failed to get user");
export const PATCH = withAuth(patchUserIdHandler, "Failed to update user");
export const DELETE = withAuth(deleteUserIdHandler, "Failed to delete account");
