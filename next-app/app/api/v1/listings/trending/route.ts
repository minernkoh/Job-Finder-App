/**
 * GET /api/v1/listings/trending: returns top trending listings by recent views. Public.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { getTrendingListingIds } from "@/lib/services/listing-views.service";
import { getListingById } from "@/lib/services/listings.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      10,
      Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10) || 5)
    );
    const timeframe = parseInt(searchParams.get("timeframe") ?? "24", 10) || 24;

    const ids = await getTrendingListingIds(limit, timeframe);
    const listings: Awaited<ReturnType<typeof getListingById>>[] = [];
    for (const id of ids) {
      const listing = await getListingById(id);
      if (listing) listings.push(listing);
    }

    return NextResponse.json({
      success: true,
      data: { listings },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch trending listings");
  }
}
