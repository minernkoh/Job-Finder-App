/**
 * GET /api/v1/summaries: fetch existing AI summary for a listing (read-only). Query: ?listingId=...
 * POST /api/v1/summaries: create or return cached AI summary for listingId, text, or url. Requires auth.
 */

import { CreateSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import {
  getOrCreateSummary,
  getSummaryForListing,
} from "@/lib/services/summaries.service";
import { getEnv } from "@/lib/env";
import { isValidObjectId } from "@/lib/objectid";

async function getSummariesHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const listingId = request.nextUrl.searchParams.get("listingId")?.trim();
  if (!listingId || !isValidObjectId(listingId)) {
    return NextResponse.json(
      { success: false, message: "Valid listingId query parameter required" },
      { status: 400 }
    );
  }

  try {
    const summary = await getSummaryForListing(payload.sub, listingId);
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch summary";
    if (message === "Listing not found") {
      return NextResponse.json({ success: false, message }, { status: 404 });
    }
    if (message === "Invalid user") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    return toErrorResponse(err, "Failed to fetch summary");
  }
}

async function postSummariesHandler(
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
  const parsed = CreateSummaryBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  try {
    const summary = await getOrCreateSummary(payload.sub, parsed.data);
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
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

export const GET = withAuth(getSummariesHandler, "Failed to fetch summary");
export const POST = withAuth(postSummariesHandler, "Failed to create summary");
