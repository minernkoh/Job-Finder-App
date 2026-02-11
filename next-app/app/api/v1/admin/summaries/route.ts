/**
 * Admin summaries list API: GET returns paginated summaries with optional user filter. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminSummariesQuerySchema } from "@schemas";
import { listSummaries } from "@/lib/services/admin-summaries.service";
import { validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";

async function getSummariesHandler(
  request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
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
}

export const GET = withAdmin(getSummariesHandler, "Failed to list summaries");
