/**
 * Admin users list API: GET returns paginated users with optional search and filters; POST creates a new user. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUsersQuerySchema, AdminCreateUserBodySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { listUsers, createUser } from "@/lib/services/admin-users.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns paginated users with optional search, role, status filters. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const url = new URL(request.url);
    const parsed = AdminUsersQuerySchema.safeParse({
      search: url.searchParams.get("search") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid query");
    const data = await listUsers(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list users");
  }
}

/** Creates a new user (email, username, password, role). Returns 201 with user or 409 if email exists. */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const body = await request.json();
    const parsed = AdminCreateUserBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const outcome = await createUser(parsed.data);
    if (!outcome.success) {
      return NextResponse.json(
        { success: false, message: outcome.reason },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: true, data: outcome.user },
      { status: 201 }
    );
  } catch (e) {
    return toErrorResponse(e, "Failed to create user");
  }
}
