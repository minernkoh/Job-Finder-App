/**
 * POST /api/v1/admin/dashboard/summary/stream: streaming AI dashboard summary. Admin only.
 * Streams NDJSON partial objects, then a _complete line with the final { summary }.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api/with-auth";
import {
  getDashboardMetrics,
  generateDashboardSummaryStream,
} from "@/lib/services/admin-dashboard.service";
import { getEnv } from "@/lib/env";

async function postSummaryStreamHandler(
  _request: NextRequest,
  _payload: { sub: string },
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "AI summarization is not configured" },
      { status: 503 },
    );
  }

  try {
    const metrics = await getDashboardMetrics();
    const { partialObjectStream, object } =
      await generateDashboardSummaryStream(metrics);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const partial of partialObjectStream) {
            const line = JSON.stringify(partial) + "\n";
            controller.enqueue(encoder.encode(line));
          }
          const finalObject = await object;
          const completeLine =
            JSON.stringify({ _complete: true, summary: finalObject.summary }) +
            "\n";
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
    }) as unknown as NextResponse;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate summary";
    if (message === "AI summarization is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}

export const POST = withAdmin(
  postSummaryStreamHandler,
  "Summary stream unavailable",
);
