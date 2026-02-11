/**
 * API helpers for listings: fetch, create, update, delete (admin), and trending. Used by React Query hooks.
 */

import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
import type { ListingsFilters } from "@/lib/query-keys";
import { apiClient } from "./client";
import { assertApiSuccess } from "./errors";
import type { ApiResponse } from "./types";

export type { ListingResult };
export type { ListingsFilters };

type ListingsData = {
  listings: ListingResult[];
  totalCount: number;
  page: number;
};

/** Fetches job listings with optional keyword, country, and filters. */
export async function fetchListings(
  page: number = 1,
  keyword?: string,
  country: string = "sg",
  filters?: ListingsFilters
): Promise<ListingsData> {
  const params = new URLSearchParams({ page: String(page), country });
  if (keyword) params.set("keyword", keyword);
  if (filters?.where) params.set("where", filters.where);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.fullTime) params.set("full_time", "1");
  if (filters?.permanent) params.set("permanent", "1");
  if (filters?.salaryMin != null && filters.salaryMin > 0)
    params.set("salary_min", String(filters.salaryMin));
  if (filters?.sortBy) params.set("sort_by", filters.sortBy);
  const res = await apiClient.get<ApiResponse<ListingsData>>(
    `/api/v1/listings?${params}`
  );
  assertApiSuccess(res.data, "Failed to fetch listings");
  return res.data.data;
}

/** Fetches job categories for a country (from Adzuna). Used to populate category filter. */
export async function fetchCategories(
  country: string = "sg"
): Promise<{ label: string; tag: string }[]> {
  const params = new URLSearchParams({ country });
  const res = await apiClient.get<
    ApiResponse<{ categories: { label: string; tag: string }[] }>
  >(`/api/v1/listings/categories?${params}`);
  assertApiSuccess(res.data, "Failed to fetch categories");
  return res.data.data.categories;
}

/** Fetches a single listing by id. */
export async function fetchListing(id: string): Promise<ListingResult> {
  const res = await apiClient.get<ApiResponse<ListingResult>>(
    `/api/v1/listings/${id}`
  );
  assertApiSuccess(res.data, "Listing not found");
  return res.data.data;
}

/** Fetches trending listings. */
export async function fetchTrending(
  limit: number = 5,
  timeframe: number = 24
): Promise<ListingResult[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    timeframe: String(timeframe),
  });
  const res = await apiClient.get<ApiResponse<{ listings: ListingResult[] }>>(
    `/api/v1/listings/trending?${params}`
  );
  assertApiSuccess(res.data, "Failed to fetch trending");
  return res.data.data.listings;
}

/** Fetches recommended listings for the current user (based on profile role/skills). Requires auth. */
export async function fetchRecommendedListings(): Promise<{
  listings: ListingResult[];
  totalCount: number;
}> {
  const res = await apiClient.get<
    ApiResponse<{ listings: ListingResult[]; totalCount: number }>
  >("/api/v1/listings/recommended");
  assertApiSuccess(res.data, "Failed to fetch recommended listings");
  return res.data.data;
}

/** Records a view for a listing (fire-and-forget). */
export function recordListingView(listingId: string): void {
  apiClient.post(`/api/v1/listings/${listingId}/view`).catch(() => {});
}

/** Creates a listing (admin only). */
export async function createListingApi(
  body: ListingCreate
): Promise<ListingResult> {
  const res = await apiClient.post<ApiResponse<ListingResult>>(
    "/api/v1/listings",
    body
  );
  assertApiSuccess(res.data, "Failed to create listing");
  return res.data.data;
}

/** Updates a listing (admin only). */
export async function updateListingApi(
  id: string,
  body: ListingUpdate
): Promise<ListingResult> {
  const res = await apiClient.patch<ApiResponse<ListingResult>>(
    `/api/v1/listings/${id}`,
    body
  );
  assertApiSuccess(res.data, "Failed to update listing");
  return res.data.data;
}

/** Deletes a listing (admin only). */
export async function deleteListingApi(id: string): Promise<void> {
  const res = await apiClient.delete<{ success: boolean; message?: string }>(
    `/api/v1/listings/${id}`
  );
  if (!res.data.success)
    throw new Error(res.data.message ?? "Failed to delete listing");
}
