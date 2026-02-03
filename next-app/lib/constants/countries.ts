/**
 * Single source for job-search country options shown in the UI. Subset of Adzuna-supported countries so backend and frontend stay aligned.
 */

export const JOB_SEARCH_COUNTRIES = [
  { code: "sg", label: "Singapore" },
  { code: "gb", label: "UK" },
  { code: "us", label: "USA" },
  { code: "au", label: "Australia" },
] as const;
