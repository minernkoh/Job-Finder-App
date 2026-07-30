/**
 * User by ID API: GET returns one user (own profile or admin); PATCH updates user (own profile or admin); DELETE removes own account (cascade).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { UserUpdateSchema } from "@schemas";
import { parseJsonBody, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { requireOwnOrAdmin } from "@/lib/auth/guard";
import { isValidObjectId } from "@/lib/objectid";
import { hashPassword } from "@/lib/auth/password";
import { deleteUser } from "@/lib/services/admin-users.service";
import { serializeUser } from "@/lib/user-serializer";

interface UserRow {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

async function getUserIdHandler(
  _request: NextRequest,
  payload: { sub: string; role: string },
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const forbidden = requireOwnOrAdmin(payload, id);
  if (forbidden) return forbidden;

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid user id" },
      { status: 400 },
    );
  }

  const sql = getSql();
  const [user] = (await sql`
    select id, email, username, role, created_at, updated_at from users where id = ${id}
  `) as unknown as UserRow[];
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
  const forbidden = requireOwnOrAdmin(payload, id);
  if (forbidden) return forbidden;

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

  const sql = getSql();
  const [user] = (await sql`
    select id, role from users where id = ${id}
  `) as unknown as Array<{ id: string; role: string }>;
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.email !== undefined) {
    const [existing] = (await sql`
      select id from users where email = ${parsed.data.email} and role = ${user.role} and id <> ${id} limit 1
    `) as unknown as Array<{ id: string }>;
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 409 },
      );
    }
    update.email = parsed.data.email;
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
    const [existingByUsername] = (await sql`
      select id from users where username = ${trimmed} and id <> ${id} limit 1
    `) as unknown as Array<{ id: string }>;
    if (existingByUsername) {
      return NextResponse.json(
        { success: false, message: "Username already taken" },
        { status: 409 },
      );
    }
    update.username = trimmed;
  }
  if (parsed.data.password !== undefined)
    update.password = await hashPassword(parsed.data.password);

  if (Object.keys(update).length > 0) {
    await sql`update users set ${sql(update)} where id = ${id}`;
  }

  const [updated] = (await sql`
    select id, email, username, role, created_at, updated_at from users where id = ${id}
  `) as unknown as UserRow[];
  return NextResponse.json({
    success: true,
    data: serializeUser(updated),
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
