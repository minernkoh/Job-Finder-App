/**
 * POST /api/v1/profile/suggest-skills: returns AI-suggested skills for a given current role. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { SuggestSkillsBodySchema } from "@schemas";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { suggestSkillsWithRetry } from "@/lib/services/suggest-skills.service";
import { getEnv } from "@/lib/env";

async function postSuggestSkillsHandler(
  request: NextRequest,
  _payload: { sub: string }
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI skill suggestions are not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = SuggestSkillsBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  try {
    const result = await suggestSkillsWithRetry(parsed.data.currentRole);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to suggest skills";
    if (message === "AI skill suggestions are not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    return toErrorResponse(err, "Failed to suggest skills");
  }
}

export const POST = withAuth(postSuggestSkillsHandler, "Failed to suggest skills");
