/**
 * POST /api/v1/demo/resume/tailor: guest preview tailor via Gemini. No TailoredResume row. IP quota.
 */

import { DemoTailorBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import {
  parseJsonBody,
  toErrorResponse,
  validationErrorResponse,
} from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/request-ip";
import { consumeGuestAiQuota } from "@/lib/services/ai-quota.service";
import { tailorResumeForGuest } from "@/lib/services/tailor.service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    if (!env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        { success: false, message: "AI summarization is not configured" },
        { status: 503 },
      );
    }

    const [body, parseError] = await parseJsonBody(request);
    if (parseError) return parseError;
    const parsed = DemoTailorBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

    await connectDB();
    await consumeGuestAiQuota(getClientIp(request));
    const result = await tailorResumeForGuest(
      parsed.data.profile,
      parsed.data.listingId,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return toErrorResponse(err, "Failed to tailor resume");
  }
}
