/**
 * Single source of truth for React Query keys. Used by hooks and pages for queryKey and invalidateQueries.
 */

export type { ListingsFilters } from "@/lib/types/listings";
import type { ListingsFilters } from "@/lib/types/listings";

export const savedKeys = { all: ["saved"] as const };
export const savedCheckKeys = { all: ["savedCheck"] as const };

export function listingsKeys(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters | null
): readonly [string, string, number, string, string] {
  const f = filters ?? {};
  const filterKey = JSON.stringify({
    where: f.where ?? "",
    category: f.category ?? "",
    fullTime: f.fullTime ?? false,
    permanent: f.permanent ?? false,
    salaryMin: f.salaryMin ?? "",
    sortBy: f.sortBy ?? "",
  });
  return ["listings", country, page, keyword ?? "", filterKey];
}

export function listingKeys(id: string): readonly [string, string] {
  return ["listing", id];
}

/** Query key for summary by listing. Used for fetch and invalidation. */
export function summaryKeys(listingId: string): readonly [string, string] {
  return ["summary", listingId];
}

export const trendingKeys = { all: ["trending"] as const };
export const recommendedKeys = { all: ["recommended"] as const };

export function adminListingsKeys(page: number, limit: number): readonly [string, string, number, number] {
  return ["admin", "listings", page, limit];
}

export function adminSummariesKeys(userIdFilter: string, page: number, limit: number): readonly [string, string, string, number, number] {
  return ["admin", "summaries", userIdFilter, page, limit];
}

export function adminUsersKeys(search: string, role: string, status: string, page: number, limit: number): readonly [string, string, string, string, string, number, number] {
  return ["admin", "users", search, role, status, page, limit];
}
