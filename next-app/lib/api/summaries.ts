/**
 * API helpers for summaries: create (POST), get by id, and compare (POST). Used by job detail, summarize, and compare pages.
 */

import type { AISummary, ComparisonSummary } from "@schemas";
import { apiClient } from "./client";
import { assertApiSuccess, getErrorMessage } from "./errors";
import type { ApiResponse } from "./types";

export type SummaryWithId = AISummary & { id: string };

export interface CreateSummaryBody {
  listingId?: string;
  text?: string;
  url?: string;
  /** When true, skip cache and always generate a new summary. */
  forceRegenerate?: boolean;
}

/** Fetches existing summary for a listing (read-only). Returns null if none exists. */
export async function getSummaryForListing(
  listingId: string
): Promise<SummaryWithId | null> {
  const res = await apiClient.get<ApiResponse<SummaryWithId | null>>(
    `/api/v1/summaries?listingId=${encodeURIComponent(listingId)}`
  );
  if (!res.data.success) {
    throw new Error(res.data.message ?? "Failed to fetch summary");
  }
  return res.data.data ?? null;
}

/** Creates or returns cached AI summary. Body: { listingId } or { text } or { url }. */
export async function createSummary(
  body: CreateSummaryBody
): Promise<SummaryWithId> {
  try {
    const res = await apiClient.post<ApiResponse<SummaryWithId>>(
      "/api/v1/summaries",
      body
    );
    assertApiSuccess(res.data, "Failed to create summary");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to create summary"));
  }
}

/** Generates unified comparison summary for 2–3 listing IDs. Requires auth. */
export async function createComparisonSummary(
  listingIds: string[]
): Promise<ComparisonSummary> {
  try {
    const res = await apiClient.post<ApiResponse<ComparisonSummary>>(
      "/api/v1/summaries/compare",
      { listingIds }
    );
    assertApiSuccess(res.data, "Failed to create comparison");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to create comparison"));
  }
}
