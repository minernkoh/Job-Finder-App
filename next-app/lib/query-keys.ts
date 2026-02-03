/**
 * Single source of truth for React Query keys. Used by hooks and pages for queryKey and invalidateQueries.
 */

export const savedKeys = { all: ["saved"] as const };
export const savedCheckKeys = { all: ["savedCheck"] as const };

export function listingsKeys(
  country: string,
  page: number,
  keyword?: string
): readonly [string, string, number, string] {
  return ["listings", country, page, keyword ?? ""];
}

export function listingKeys(id: string): readonly [string, string] {
  return ["listing", id];
}

export const trendingKeys = { all: ["trending"] as const };
