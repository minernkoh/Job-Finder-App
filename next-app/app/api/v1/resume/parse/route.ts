/**
 * POST /api/v1/resume/parse: parse resume text via AI and upsert user profile. Accepts JSON { text } or multipart file (PDF or DOCX, max 5MB). Requires auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { withAiAccess } from "@/lib/api/with-auth";
import {
  DOCX_EXTRACT_ERROR_MESSAGE,
  PDF_EXTRACT_ERROR_MESSAGE,
  readResumeTextFromRequest,
} from "@/lib/api/resume-parse-input";
import { consumeAiQuota } from "@/lib/services/ai-quota.service";
import { getEnv } from "@/lib/env";
import {
  parseResumeWithRetry,
  upsertProfileForUser,
} from "@/lib/services/resume.service";

async function postParseHandler(
  request: NextRequest,
  payload: { sub: string },
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "Resume parsing is not configured" },
      { status: 503 },
    );
  }

  let text: string;
  try {
    const extracted = await readResumeTextFromRequest(request);
    if (!extracted.ok) return extracted.response;
    text = extracted.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    if (
      message === "File must be 5MB or smaller" ||
      message === PDF_EXTRACT_ERROR_MESSAGE ||
      message === DOCX_EXTRACT_ERROR_MESSAGE ||
      message === "Only PDF or DOCX files up to 5MB are supported."
    ) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return toErrorResponse(err, "Failed to parse resume");
  }

  try {
    await consumeAiQuota(payload.sub, "general");
    const result = await parseResumeWithRetry(text);
    const flatSkills =
      result.skillGroups?.flatMap((g) => g.skills) ?? result.skills ?? [];
    await upsertProfileForUser(payload.sub, {
      jobTitles: result.jobTitles,
      resumeSummary: result.resumeSummary,
      ...(result.yearsOfExperience != null ? { yearsOfExperience: result.yearsOfExperience } : {}),
      name: result.name,
      headline: result.headline,
      contacts: result.contacts,
      experience: result.experience,
      projects: result.projects,
      education: result.education,
      honours: result.honours,
      skillGroups: result.skillGroups,
      ...(flatSkills.length > 0 ? { skills: flatSkills } : {}),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    if (message === "Resume parsing is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    if (message === "Invalid user") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    return toErrorResponse(err, "Failed to parse resume");
  }
}

export const POST = withAiAccess(postParseHandler, "Failed to parse resume");
