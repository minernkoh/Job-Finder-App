/**
 * GET /api/v1/listings/recommended: returns job listings recommended for the current user based on profile (role/skills). Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getProfileByUserId } from "@/lib/services/resume.service";
import { searchListings } from "@/lib/services/listings.service";

const DEFAULT_COUNTRY = "sg";
const RECOMMENDED_LIMIT = 10;

async function getRecommendedHandler(
  _request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const profile = await getProfileByUserId(payload.sub);
  const jobTitles = profile?.jobTitles ?? [];
  const skills = profile?.skills ?? [];
  const keyword =
    jobTitles.length > 0 && jobTitles[0]?.trim()
      ? jobTitles[0].trim()
      : skills.length > 0
        ? skills.slice(0, 3).join(" ")
        : undefined;
  const { listings, totalCount } = await searchListings(
    DEFAULT_COUNTRY,
    1,
    keyword
  );
  const recommended = listings.slice(0, RECOMMENDED_LIMIT);
  return NextResponse.json({
    success: true,
    data: { listings: recommended, totalCount },
  });
}

export const GET = withAuth(
  getRecommendedHandler,
  "Failed to fetch recommended listings"
);
