/**
 * Single source for country codes and UI options. SUPPORTED_COUNTRIES is the full Adzuna-supported list; JOB_SEARCH_COUNTRIES is the subset shown in the job search UI.
 */

/** All Adzuna-supported country codes. Used by the Adzuna service for validation and API calls. */
export const SUPPORTED_COUNTRIES = [
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

/** Subset of SUPPORTED_COUNTRIES shown in the job search UI (country selector). */
export const JOB_SEARCH_COUNTRIES = [
  { code: "sg" as const, label: "Singapore" },
  { code: "gb" as const, label: "UK" },
  { code: "us" as const, label: "USA" },
  { code: "au" as const, label: "Australia" },
] as const;
