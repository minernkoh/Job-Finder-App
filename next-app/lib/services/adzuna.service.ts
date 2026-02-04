/**
 * Adzuna API client: fetches job listings from Adzuna with country support. Used by listings service.
 */

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name?: string };
  description?: string;
  redirect_url?: string;
  /** Minimum salary from Adzuna (numeric, local currency). Optional; not all jobs include salary. */
  salary_min?: number;
  /** Maximum salary from Adzuna (numeric, local currency). Optional; not all jobs include salary. */
  salary_max?: number;
}

export interface AdzunaSearchResponse {
  results: AdzunaJob[];
  count: number;
}

const SUPPORTED_COUNTRIES = [
  "gb",
  "at",
  "au",
  "be",
  "br",
  "ca",
  "ch",
  "de",
  "es",
  "fr",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "ru",
  "sg",
  "us",
  "za",
] as const;

export type AdzunaCountry = (typeof SUPPORTED_COUNTRIES)[number];

/** Validates country code against Adzuna supported countries. Defaults to sg if invalid. */
export function validateCountry(country: string): AdzunaCountry {
  const c = country?.toLowerCase().slice(0, 2) || "sg";
  return SUPPORTED_COUNTRIES.includes(c as AdzunaCountry)
    ? (c as AdzunaCountry)
    : "sg";
}

/** Options for Adzuna job search; all optional and map to API query params. */
export interface AdzunaSearchOptions {
  what?: string;
  resultsPerPage?: number;
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
}

/** Fetches job search results from Adzuna API. */
export async function fetchAdzunaSearch(
  appId: string,
  appKey: string,
  country: AdzunaCountry,
  page: number,
  options?: AdzunaSearchOptions
): Promise<AdzunaSearchResponse> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(options?.resultsPerPage ?? 20),
  });
  if (options?.what?.trim()) params.set("what", options.what.trim());
  if (options?.where?.trim()) params.set("where", options.where.trim());
  if (options?.category?.trim())
    params.set("category", options.category.trim());
  if (options?.fullTime === true) params.set("full_time", "1");
  if (options?.permanent === true) params.set("permanent", "1");
  if (options?.salaryMin != null && options.salaryMin > 0)
    params.set("salary_min", String(options.salaryMin));
  if (options?.sortBy?.trim()) params.set("sort_by", options.sortBy.trim());
  const url = `${ADZUNA_BASE}/${country}/search/${page}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adzuna API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as AdzunaSearchResponse;
  return data;
}

/** Category item returned by Adzuna categories endpoint. */
export interface AdzunaCategory {
  label: string;
  tag: string;
}

/** Fetches job categories for a country from Adzuna API. Used to populate category filter dropdown. */
export async function fetchAdzunaCategories(
  appId: string,
  appKey: string,
  country: AdzunaCountry
): Promise<AdzunaCategory[]> {
  const params = new URLSearchParams({ app_id: appId, app_key: appKey });
  const url = `${ADZUNA_BASE}/${country}/categories?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Adzuna categories error ${res.status}: ${text.slice(0, 200)}`
    );
  }
  const data = (await res.json()) as {
    results?: { label: string; tag: string }[];
  };
  const results = data?.results ?? [];
  return results.map((r) => ({ label: r.label ?? "", tag: r.tag ?? "" }));
}
