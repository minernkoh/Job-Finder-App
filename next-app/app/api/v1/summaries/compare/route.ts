/**
 * POST /api/v1/summaries/compare: generate unified AI comparison for 2–3 listing IDs. Requires auth.
 */

import { CompareSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { getProfileByUserId } from "@/lib/services/resume.service";
import { generateComparisonSummary } from "@/lib/services/summaries.service";
import { getEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI summarization is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CompareSummaryBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

    const profile = await getProfileByUserId(payload.sub);
    const userSkills = profile?.skills ?? [];
    const currentRole =
      profile?.jobTitles?.length ? profile.jobTitles[0] : undefined;
    const comparison = await generateComparisonSummary(parsed.data.listingIds, {
      userSkills,
      currentRole,
      yearsOfExperience: profile?.yearsOfExperience,
    });
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
