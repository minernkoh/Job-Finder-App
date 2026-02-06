/**
 * Admin listings list API: GET returns paginated cached listings. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminListingsQuerySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { listListings } from "@/lib/services/admin-listings.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns paginated listings. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const url = new URL(request.url);
    const parsed = AdminListingsQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid query");
    const data = await listListings(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list listings");
  }
}
