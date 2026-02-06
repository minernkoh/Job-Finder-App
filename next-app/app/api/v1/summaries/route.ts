/**
 * POST /api/v1/summaries: create or return cached AI summary for listingId, text, or url. Requires auth.
 */

import { CreateSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { getOrCreateSummary } from "@/lib/services/summaries.service";
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
    const parsed = CreateSummaryBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

    const summary = await getOrCreateSummary(payload.sub, parsed.data);
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error("POST /api/v1/summaries", err);
    const message =
      err instanceof Error ? err.message : "Failed to create summary";
    if (message === "AI summarization is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    if (message === "Listing not found") {
      return NextResponse.json({ success: false, message }, { status: 404 });
    }
    if (message === "Invalid user") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (
      message.includes("Could not fetch URL") ||
      message.includes("No text content")
    ) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return toErrorResponse(err, "Failed to create summary");
  }
}
