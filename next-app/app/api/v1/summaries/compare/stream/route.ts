/**
 * POST /api/v1/summaries/compare/stream: streaming AI comparison for 2–3 listing IDs. Requires auth.
 * Streams NDJSON partial objects, then a _complete line with the final comparison.
 */

import { CompareSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { getProfileByUserId } from "@/lib/services/resume.service";
import {
  prepareComparisonStream,
  generateComparisonSummaryStream,
  saveComparisonSummaryToDb,
} from "@/lib/services/summaries.service";
import { getEnv } from "@/lib/env";

async function postCompareStreamHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI summarization is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CompareSummaryBodySchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid body");
  }

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
    const { partialObjectStream, object } =
      await generateComparisonSummaryStream(parsed.data.listingIds, {
        userSkills,
        currentRole,
        yearsOfExperience: profile?.yearsOfExperience,
      });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const partial of partialObjectStream) {
            const line = JSON.stringify(partial) + "\n";
            controller.enqueue(encoder.encode(line));
          }
          const finalObject = await object;
          await saveComparisonSummaryToDb(
            payload.sub,
            parsed.data.listingIds,
            finalObject
          );
          const completeLine =
            JSON.stringify({ _complete: true, ...finalObject }) + "\n";
          controller.enqueue(encoder.encode(completeLine));
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream generation failed";
          const errorLine = JSON.stringify({ _error: true, message }) + "\n";
          controller.enqueue(encoder.encode(errorLine));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    }) as unknown as NextResponse;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to compare listings";
    if (message === "AI summarization is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    if (
      message === "Listing not found" ||
      message === "Exactly 2 or 3 listing IDs are required"
    ) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return toErrorResponse(err, "Failed to compare listings");
  }
}

export const POST = withAuth(
  postCompareStreamHandler,
  "Failed to compare listings",
);
