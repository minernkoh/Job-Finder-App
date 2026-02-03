/**
 * GET /api/v1/listings: search job listings with keyword and country. Returns paginated results from Adzuna (cached).
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { searchListings } from "@/lib/services/listings.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "sg";
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1
    );
    const keyword = searchParams.get("keyword")?.trim() ?? undefined;

    const { listings, totalCount } = await searchListings(
      country,
      page,
      keyword
    );

    return NextResponse.json({
      success: true,
      data: { listings, totalCount, page },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch listings");
  }
}
