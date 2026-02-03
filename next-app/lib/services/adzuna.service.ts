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

/** Fetches job search results from Adzuna API. */
export async function fetchAdzunaSearch(
  appId: string,
  appKey: string,
  country: AdzunaCountry,
  page: number,
  options?: { what?: string; resultsPerPage?: number }
): Promise<AdzunaSearchResponse> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(options?.resultsPerPage ?? 20),
  });
  if (options?.what?.trim()) params.set("what", options.what.trim());
  const url = `${ADZUNA_BASE}/${country}/search/${page}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adzuna API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as AdzunaSearchResponse;
  return data;
}
