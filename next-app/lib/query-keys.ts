/**
 * Single source of truth for React Query keys. Used by hooks and pages for queryKey and invalidateQueries.
 */

export const savedKeys = { all: ["saved"] as const };
export const savedCheckKeys = { all: ["savedCheck"] as const };

/** Filters object for listings query key; must be JSON-serializable and stable. */
export interface ListingsFiltersKey {
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
}

export function listingsKeys(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFiltersKey | null
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

export const trendingKeys = { all: ["trending"] as const };
export const recommendedKeys = { all: ["recommended"] as const };

export function categoriesKeys(
  country: string
): readonly [string, string, string] {
  return ["listings", "categories", country];
}
