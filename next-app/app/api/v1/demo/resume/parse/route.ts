/**
 * POST /api/v1/demo/resume/parse: guest preview resume parse via Gemini. No user upsert. IP quota.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import {
  DOCX_EXTRACT_ERROR_MESSAGE,
  PDF_EXTRACT_ERROR_MESSAGE,
  readResumeTextFromRequest,
} from "@/lib/api/resume-parse-input";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/request-ip";
import { consumeGuestAiQuota } from "@/lib/services/ai-quota.service";
import { parseResumeWithRetry } from "@/lib/services/resume.service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    if (!env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        { success: false, message: "Resume parsing is not configured" },
        { status: 503 },
      );
    }

    const extracted = await readResumeTextFromRequest(request);
    if (!extracted.ok) return extracted.response;

    await connectDB();
    await consumeGuestAiQuota(getClientIp(request));
    const result = await parseResumeWithRetry(extracted.text);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    if (message === "Resume parsing is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
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
}
