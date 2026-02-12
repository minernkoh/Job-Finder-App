/**
 * API helpers for admin dashboard: streaming dashboard summary. Used by the admin page.
 */

import { consumeNdjsonStream, createAuthenticatedStream } from "./stream";

/** POST to the dashboard summary stream endpoint; returns the response body reader. */
export async function createDashboardSummaryStream(): Promise<{
  reader: ReadableStreamDefaultReader<Uint8Array>;
}> {
  return createAuthenticatedStream("/api/v1/admin/dashboard/summary/stream");
}

/** Result of the dashboard summary stream: single field summary. */
export interface DashboardSummaryResult {
  summary: string;
}

/**
 * Reads the dashboard summary NDJSON stream and calls onPartial for each partial object.
 * Returns the final { summary } from the _complete line; throws on _error.
 */
export async function consumeDashboardSummaryStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPartial: (partial: { summary?: string }) => void,
): Promise<DashboardSummaryResult> {
  return consumeNdjsonStream<DashboardSummaryResult>(
    reader,
    onPartial,
    (parsed) => ({
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    }),
    "Stream ended without a complete summary",
  );
}
