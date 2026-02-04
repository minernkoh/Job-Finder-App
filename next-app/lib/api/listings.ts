/**
 * API helpers for listings: fetch search results, single listing, and trending. Used by React Query hooks.
 */

import type { ListingResult } from "@schemas";
import { apiClient } from "./client";

export type { ListingResult };

export interface ListingsResponse {
  success: boolean;
  data: {
    listings: ListingResult[];
    totalCount: number;
    page: number;
  };
}

export interface ListingResponse {
  success: boolean;
  data: ListingResult;
}

export interface TrendingResponse {
  success: boolean;
  data: { listings: ListingResult[] };
}

/** Filter options for job search; aligned with Adzuna API and GET /api/v1/listings. */
export interface ListingsFilters {
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
}

/** Fetches job listings with optional keyword, country, and filters. */
export async function fetchListings(
  page: number = 1,
  keyword?: string,
  country: string = "sg",
  filters?: ListingsFilters
): Promise<ListingsResponse["data"]> {
  const params = new URLSearchParams({ page: String(page), country });
  if (keyword) params.set("keyword", keyword);
  if (filters?.where) params.set("where", filters.where);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.fullTime) params.set("full_time", "1");
  if (filters?.permanent) params.set("permanent", "1");
  if (filters?.salaryMin != null && filters.salaryMin > 0)
    params.set("salary_min", String(filters.salaryMin));
  if (filters?.sortBy) params.set("sort_by", filters.sortBy);
  const res = await apiClient.get<ListingsResponse>(
    `/api/v1/listings?${params}`
  );
  if (!res.data.success) throw new Error("Failed to fetch listings");
  return res.data.data;
}

export interface CategoriesResponse {
  success: boolean;
  data: { categories: { label: string; tag: string }[] };
}

/** Fetches job categories for a country (from Adzuna). Used to populate category filter. */
export async function fetchCategories(
  country: string = "sg"
): Promise<{ label: string; tag: string }[]> {
  const params = new URLSearchParams({ country });
  const res = await apiClient.get<CategoriesResponse>(
    `/api/v1/listings/categories?${params}`
  );
  if (!res.data.success) throw new Error("Failed to fetch categories");
  return res.data.data.categories;
}

/** Fetches a single listing by id. */
export async function fetchListing(id: string): Promise<ListingResult> {
  const res = await apiClient.get<ListingResponse>(`/api/v1/listings/${id}`);
  const d = res.data;
  if (!d.success || !("data" in d) || !d.data)
    throw new Error("Listing not found");
  return d.data;
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
  const res = await apiClient.get<TrendingResponse>(
    `/api/v1/listings/trending?${params}`
  );
  if (!res.data.success) throw new Error("Failed to fetch trending");
  return res.data.data.listings;
}

/** Records a view for a listing (fire-and-forget). */
export function recordListingView(listingId: string): void {
  apiClient.post(`/api/v1/listings/${listingId}/view`).catch(() => {});
}
