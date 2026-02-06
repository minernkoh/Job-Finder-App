/**
 * POST /api/v1/profile/suggest-skills: returns AI-suggested skills for a given current role. Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { SuggestSkillsBodySchema } from "@schemas";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { suggestSkillsWithRetry } from "@/lib/services/suggest-skills.service";
import { getEnv } from "@/lib/env";

/** Returns suggested skills for the given current role using Gemini. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI skill suggestions are not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = SuggestSkillsBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

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
