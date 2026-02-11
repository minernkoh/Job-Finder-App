/**
 * POST /api/v1/summaries/stream: streaming AI summary generation.
 * Cache hit returns full JSON immediately; cache miss streams NDJSON partial objects as Gemini generates them.
 */

import { CreateSummaryBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import {
  prepareSummaryStream,
  generateSummaryStream,
  saveSummaryToDb,
} from "@/lib/services/summaries.service";
import { getEnv } from "@/lib/env";

async function postStreamHandler(
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

  const parsed = CreateSummaryBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  try {
    const result = await prepareSummaryStream(payload.sub, parsed.data);

  /* Cache hit: return full JSON immediately (no streaming needed). */
  if (result.cached) {
    return NextResponse.json({ success: true, data: result.data });
  }

  /* Cache miss: stream partial objects as NDJSON. */
  const { resolvedInput, inputTextHash, uid, userSkills, yearsOfExperience } =
    result;
  const { partialObjectStream, object } = await generateSummaryStream(
    resolvedInput.text,
    {
      fromAdzunaPage: resolvedInput.fromAdzunaPage,
      userSkills,
      jobTitle: resolvedInput.jobTitle,
      company: resolvedInput.company,
      yearsOfExperience,
    },
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partial of partialObjectStream) {
          const line = JSON.stringify(partial) + "\n";
          controller.enqueue(encoder.encode(line));
        }
        /* Wait for the final object and save to DB. */
        const finalObject = await object;
        const saved = await saveSummaryToDb(uid, inputTextHash, finalObject);
        const completeLine =
          JSON.stringify({ _complete: true, ...saved }) + "\n";
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
    },
  });
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
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}

export const POST = withAuth(postStreamHandler, "Failed to create summary");
