/** Sort options for job search. Used by browse page and API validation. */
export const SORT_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Relevance" },
  { value: "salary_desc", label: "Salary: Highest first" },
  { value: "salary_asc", label: "Salary: Lowest first" },
  { value: "date_desc", label: "Date: Most recent" },
  { value: "date_asc", label: "Date: Oldest first" },
];

/** API allowlist for sort_by query param. Empty string (relevance) is not sent to API. */
export const SORT_BY_ALLOWLIST = [
  "salary_desc",
  "salary_asc",
  "date_desc",
  "date_asc",
] as const;
