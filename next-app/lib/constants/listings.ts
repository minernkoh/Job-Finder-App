/** Sort options for job search. Used by browse page and API validation. */
export const SORT_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Relevance" },
  { value: "salary", label: "Salary" },
  { value: "date", label: "Date" },
];

/** API allowlist for sort_by query param. Empty string (relevance) is not sent to API. */
export const SORT_BY_ALLOWLIST = ["salary", "date"] as const;
