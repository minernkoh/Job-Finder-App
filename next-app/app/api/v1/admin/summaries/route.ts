/**
 * Admin summaries list API: GET returns paginated summaries with optional user filter. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminSummariesQuerySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { listSummaries } from "@/lib/services/admin-summaries.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns paginated summaries; optional userId filter. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const url = new URL(request.url);
    const parsed = AdminSummariesQuerySchema.safeParse({
      userId: url.searchParams.get("userId") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid query");
    const data = await listSummaries(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list summaries");
  }
}
