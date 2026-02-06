/**
 * API helpers for summaries: create (POST), get by id, and compare (POST). Used by job detail, summarize, and compare pages.
 */

import type { AISummary, ComparisonSummary } from "@schemas";
import { apiClient } from "./client";

export type SummaryWithId = AISummary & { id: string };

export interface CreateSummaryBody {
  listingId?: string;
  text?: string;
  url?: string;
}

export interface CreateSummaryResponse {
  success: boolean;
  data: SummaryWithId;
}

export interface GetSummaryResponse {
  success: boolean;
  data: SummaryWithId;
}

/** Creates or returns cached AI summary. Body: { listingId } or { text } or { url }. */
export async function createSummary(
  body: CreateSummaryBody
): Promise<SummaryWithId> {
  try {
    const res = await apiClient.post<CreateSummaryResponse>(
      "/api/v1/summaries",
      body
    );
    if (!res.data.success || !res.data.data)
      throw new Error(
        (res.data as { message?: string }).message ?? "Failed to create summary"
      );
    return res.data.data;
  } catch (err: unknown) {
    const res = err as { response?: { data?: { message?: string } } };
    const message =
      res.response?.data?.message ??
      (err instanceof Error ? err.message : "Failed to create summary");
    throw new Error(message);
  }
}

/** Fetches a summary by id (own only). */
export async function getSummary(id: string): Promise<SummaryWithId> {
  const res = await apiClient.get<GetSummaryResponse>(
    `/api/v1/summaries/${id}`
  );
  if (!res.data.success || !res.data.data) throw new Error("Summary not found");
  return res.data.data;
}

export interface CreateComparisonResponse {
  success: boolean;
  data: ComparisonSummary;
}

/** Generates unified comparison summary for 2–3 listing IDs. Requires auth. */
export async function createComparisonSummary(
  listingIds: string[]
): Promise<ComparisonSummary> {
  try {
    const res = await apiClient.post<CreateComparisonResponse>(
      "/api/v1/summaries/compare",
      { listingIds }
    );
    if (!res.data.success || !res.data.data)
      throw new Error(
        (res.data as { message?: string }).message ??
          "Failed to create comparison"
      );
    return res.data.data;
  } catch (err: unknown) {
    const res = err as { response?: { data?: { message?: string } } };
    const message =
      res.response?.data?.message ??
      (err instanceof Error ? err.message : "Failed to create comparison");
    throw new Error(message);
  }
}
