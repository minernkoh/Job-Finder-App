/**
 * POST /api/v1/resume/tailor: tailor the master profile to a listing. Requires AI unlock + quota.
 */

import { TailorResumeBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, validationErrorResponse } from "@/lib/api/errors";
import { withAiAccess } from "@/lib/api/with-auth";
import { getEnv } from "@/lib/env";
import { tailorResumeForListing } from "@/lib/services/tailor.service";

export const maxDuration = 60;

async function postTailorHandler(
  request: NextRequest,
  payload: { sub: string },
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI summarization is not configured" },
      { status: 503 },
    );
  }

  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = TailorResumeBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  const result = await tailorResumeForListing(
    payload.sub,
    parsed.data.listingId,
    parsed.data.forceRegenerate === true,
  );
  return NextResponse.json({ success: true, data: result });
}

export const POST = withAiAccess(postTailorHandler, "Failed to tailor resume");
