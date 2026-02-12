/**
 * POST /api/v1/summaries/compare: generate unified AI comparison for 2–3 listing IDs. Requires auth.
 */

import { CompareSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { getProfileByUserId } from "@/lib/services/resume.service";
import {
  prepareComparisonStream,
  generateComparisonSummary,
  saveComparisonSummaryToDb,
} from "@/lib/services/summaries.service";
import { getEnv } from "@/lib/env";

async function postCompareHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI summarization is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = CompareSummaryBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  try {
    const cacheResult = await prepareComparisonStream(payload.sub, {
      listingIds: parsed.data.listingIds,
      forceRegenerate: parsed.data.forceRegenerate,
    });
    if (cacheResult.cached) {
      return NextResponse.json({ success: true, data: cacheResult.data });
    }

    const profile = await getProfileByUserId(payload.sub);
    const userSkills = profile?.skills ?? [];
    const currentRole =
      profile?.jobTitles?.length ? profile.jobTitles[0] : undefined;
    const comparison = await generateComparisonSummary(parsed.data.listingIds, {
      userSkills,
      currentRole,
      yearsOfExperience: profile?.yearsOfExperience,
    });
    await saveComparisonSummaryToDb(
      payload.sub,
      parsed.data.listingIds,
      comparison
    );
    return NextResponse.json({ success: true, data: comparison });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to compare listings";
    if (message === "AI summarization is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    if (message === "Listing not found" || message === "Exactly 2 or 3 listing IDs are required") {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return toErrorResponse(err, "Failed to compare listings");
  }
}

export const POST = withAuth(postCompareHandler, "Failed to compare listings");
