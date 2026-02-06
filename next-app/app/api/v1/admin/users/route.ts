/**
 * Admin users list API: GET returns paginated users with optional search and filters. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminUsersQuerySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { listUsers } from "@/lib/services/admin-users.service";
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
