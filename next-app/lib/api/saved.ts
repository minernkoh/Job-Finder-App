/**
 * API helpers for saved listings: save, unsave, check, and fetch saved. Used by React Query hooks.
 */

import type { ListingResult, SavedListingResult } from "@schemas";
import { apiClient } from "./client";
import { assertApiSuccess } from "./errors";
import type { ApiResponse } from "./types";

/** Converts a saved listing to ListingResult shape for use with ListingCard (id = listingId, source = adzuna). */
export function savedListingToListingResult(
  s: SavedListingResult
): ListingResult {
  return {
    id: s.listingId,
    title: s.title,
    company: s.company,
    location: s.location,
    sourceUrl: s.sourceUrl,
    country: s.country ?? "sg",
    source: "adzuna",
  };
}

/** Saves a listing for the current user. */
export async function saveListing(
  listing: ListingResult
): Promise<SavedListingResult> {
  const res = await apiClient.post<ApiResponse<SavedListingResult>>(
    "/api/v1/saved",
    {
      listingId: listing.id,
      title: listing.title,
      company: listing.company,
      location: listing.location,
      sourceUrl: listing.sourceUrl,
      country: listing.country,
    }
  );
  assertApiSuccess(res.data, "Failed to save");
  return res.data.data;
}

/** Unsaves a listing for the current user. */
export async function unsaveListing(listingId: string): Promise<void> {
  const res = await apiClient.delete<ApiResponse<undefined>>(
    `/api/v1/saved/${listingId}`
  );
  if (!res.data.success) throw new Error(res.data.message ?? "Failed to unsave");
}

/** Checks if the current user has saved a listing. */
export async function checkSaved(listingId: string): Promise<boolean> {
  const res = await apiClient.get<ApiResponse<{ saved: boolean }>>(
    `/api/v1/saved/check?listingId=${encodeURIComponent(listingId)}`
  );
  if (!res.data.success) return false;
  return res.data.data?.saved ?? false;
}

/** Fetches all saved listings for the current user. */
export async function fetchSavedListings(): Promise<SavedListingResult[]> {
  const res = await apiClient.get<
    ApiResponse<{ listings: SavedListingResult[] }>
  >("/api/v1/saved");
  assertApiSuccess(res.data, "Failed to fetch saved");
  return res.data.data.listings;
}
