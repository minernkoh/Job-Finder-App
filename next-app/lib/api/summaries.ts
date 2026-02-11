/**
 * API helpers for summaries: create (POST), stream (POST), get by id, and compare (POST). Used by job detail, summarize, and compare pages.
 */

import type {
  AISummary,
  ComparisonSummary,
  CreateSummaryBody,
} from "@schemas";
import { apiClient, getCurrentAccessToken } from "./client";
import { assertApiSuccess, getErrorMessage } from "./errors";
import type { ApiResponse } from "./types";

export type SummaryWithId = AISummary & { id: string };

export type { CreateSummaryBody };

/** Creates or returns cached AI summary. Body: { listingId } or { text } or { url }. */
export async function createSummary(
  body: CreateSummaryBody,
): Promise<SummaryWithId> {
  try {
    const res = await apiClient.post<ApiResponse<SummaryWithId>>(
      "/api/v1/summaries",
      body,
    );
    assertApiSuccess(res.data, "Failed to create summary");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to create summary"));
  }
}

/** Generates unified comparison summary for 2–3 listing IDs. Requires auth. */
export async function createComparisonSummary(
  listingIds: string[],
): Promise<ComparisonSummary> {
  try {
    const res = await apiClient.post<ApiResponse<ComparisonSummary>>(
      "/api/v1/summaries/compare",
      { listingIds },
    );
    assertApiSuccess(res.data, "Failed to create comparison");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to create comparison"));
  }
}

/** Result from the streaming summary endpoint: either a cache hit (immediate) or a stream of partials. */
export type StreamSummaryResult =
  | { stream: false; data: SummaryWithId }
  | { stream: true; reader: ReadableStreamDefaultReader<Uint8Array> };

/**
 * Calls the streaming summary endpoint. Returns either a cache-hit result (stream: false)
 * or a ReadableStream reader (stream: true) that emits NDJSON partial objects.
 */
export async function createSummaryStream(
  body: CreateSummaryBody,
): Promise<StreamSummaryResult> {
  const token = getCurrentAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/v1/summaries/stream", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const message =
      (errBody as { message?: string } | null)?.message ??
      `Request failed (${res.status})`;
    throw new Error(message);
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
  const decoder = new TextDecoder();
  let buffer = "";
  let finalSummary: SummaryWithId | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });

    /* Process complete lines. */
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;

      if (parsed._error) {
        throw new Error(String(parsed.message ?? "Stream generation failed"));
      }

      if (parsed._complete) {
        finalSummary = parsed as unknown as SummaryWithId;
        onPartial(finalSummary);
        continue;
      }

      onPartial(parsed as Partial<SummaryWithId>);
    }

    if (done) break;
  }

  if (!finalSummary) {
    throw new Error("Stream ended without a complete summary");
  }
  return finalSummary;
}
