/**
 * GET /api/v1/listings/trending: returns top trending listings by recent views. Public.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { getTrendingListingIds } from "@/lib/services/listing-views.service";
import {
  getListingsByIds,
  getRecentListings,
} from "@/lib/services/listings.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      10,
      Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10) || 5)
    );
    const timeframe = parseInt(searchParams.get("timeframe") ?? "168", 10) || 168;

    const ids = await getTrendingListingIds(limit, timeframe);
    const listings =
      ids.length > 0
        ? await getListingsByIds(ids)
        : await getRecentListings(limit);

    return NextResponse.json({
      success: true,
      data: { listings },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch trending listings");
  }
}
