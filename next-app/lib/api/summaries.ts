/**
 * API helpers for summaries: create (POST), stream (POST), get by id, and compare (POST). Used by job detail, summarize, and compare pages.
 */

import type { AISummary, ComparisonSummary, CreateSummaryBody } from "@schemas";
import { apiClient, buildAuthHeaders } from "./client";
import { consumeNdjsonStream, createAuthenticatedStream } from "./stream";
import type { ApiResponse } from "./types";

export type SummaryWithId = AISummary & { id: string };

export type { CreateSummaryBody };

/**
 * Calls the non-streaming comparison endpoint. Used as fallback when streaming fails. Uses apiClient for 401 retry.
 */
export async function createComparisonSummary(
  listingIds: string[],
): Promise<ComparisonSummary> {
  const res = await apiClient.post<ApiResponse<ComparisonSummary>>(
    "/api/v1/summaries/compare",
    { listingIds },
  );
  const json = res.data;
  if (!json.success || !json.data) {
    throw new Error(json.message ?? "Failed to load comparison");
  }
  return json.data;
}

/**
 * Calls the streaming comparison endpoint. Returns a reader for the NDJSON stream (no cache; always streams).
 */
export async function createComparisonSummaryStream(
  listingIds: string[],
): Promise<{
  reader: ReadableStreamDefaultReader<Uint8Array>;
}> {
  return createAuthenticatedStream("/api/v1/summaries/compare/stream", {
    listingIds,
  });
}

/**
 * Reads the comparison NDJSON stream and calls `onPartial` for each partial object.
 * Returns the final ComparisonSummary from the `_complete` line; throws on `_error`.
 */
export async function consumeComparisonStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPartial: (partial: Partial<ComparisonSummary>) => void,
): Promise<ComparisonSummary> {
  return consumeNdjsonStream<ComparisonSummary>(
    reader,
    onPartial,
    (parsed) => {
      const { _complete: _c, ...rest } = parsed;
      return rest as ComparisonSummary;
    },
    "Stream ended without a complete comparison",
  );
}

/** Result from the streaming summary endpoint: either a cache hit (immediate) or a stream of partials. */
export type StreamSummaryResult =
  | { stream: false; data: SummaryWithId }
  | { stream: true; reader: ReadableStreamDefaultReader<Uint8Array> };

/**
 * Fetches an existing cached AI summary for a listing (read-only). Returns null when none exists or the request fails (e.g. 404/401).
 */
export async function getSummaryForListing(
  listingId: string,
): Promise<SummaryWithId | null> {
  const res = await fetch(
    `/api/v1/summaries?listingId=${encodeURIComponent(listingId)}`,
    { headers: buildAuthHeaders(), credentials: "include" },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as ApiResponse<SummaryWithId>;
  if (!json.success || !json.data) return null;
  return json.data;
}

/**
 * Calls the streaming summary endpoint. Returns either a cache-hit result (stream: false)
 * or a ReadableStream reader (stream: true) that emits NDJSON partial objects.
 */
export async function createSummaryStream(
  body: CreateSummaryBody,
): Promise<StreamSummaryResult> {
  const res = await fetch("/api/v1/summaries/stream", {
    method: "POST",
    headers: buildAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const message =
      (errBody as { message?: string } | null)?.message ??
      `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("Content-Type") ?? "";

  /* Cache hit: full JSON response. */
  if (contentType.includes("application/json")) {
    const json = (await res.json()) as ApiResponse<SummaryWithId>;
    if (!json.success || !json.data) {
      throw new Error(json.message ?? "Failed to create summary");
    }
    return { stream: false, data: json.data };
  }

  /* Cache miss: NDJSON stream. */
  if (!res.body) throw new Error("No response body for stream");
  return { stream: true, reader: res.body.getReader() };
}

/**
 * Reads an NDJSON stream and calls `onPartial` for each partial object.
 * Returns the final complete summary (from the `_complete` line).
 */
export async function consumeSummaryStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPartial: (partial: Partial<SummaryWithId>) => void,
): Promise<SummaryWithId> {
  return consumeNdjsonStream<SummaryWithId>(
    reader,
    onPartial,
    (parsed) => parsed as unknown as SummaryWithId,
    "Stream ended without a complete summary",
  );
}
