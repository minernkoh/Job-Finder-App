/**
 * GET /api/v1/listings/recommended: returns job listings recommended for the current user based on profile (role/skills). Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse } from "@/lib/api/errors";
import { getProfileByUserId } from "@/lib/services/resume.service";
import { searchListings } from "@/lib/services/listings.service";

const DEFAULT_COUNTRY = "sg";
const RECOMMENDED_LIMIT = 10;

/** Returns listings recommended for the user based on their profile (job title or skills as search keyword). */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  try {
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
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch recommended listings");
  }
}
