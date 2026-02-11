/**
 * Admin listings list API: GET returns paginated cached listings. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminListingsQuerySchema } from "@schemas";
import { listListings } from "@/lib/services/admin-listings.service";
import { validationErrorResponse } from "@/lib/api/errors";
import { withAdmin } from "@/lib/api/with-auth";

async function getListingsHandler(
  request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = AdminListingsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid query");
  const data = await listListings(parsed.data);
  return NextResponse.json({ success: true, data });
}

export const GET = withAdmin(getListingsHandler, "Failed to list listings");
