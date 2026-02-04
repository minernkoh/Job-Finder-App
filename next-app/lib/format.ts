/**
 * Format helpers: salary display, etc. Used by listing cards and job detail pages.
 */

/** Currency prefix by Adzuna country code. Falls back to empty string for unknown countries. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  sg: "SGD ",
  gb: "£",
  us: "$",
  au: "A$",
  ca: "C$",
  nz: "NZ$",
  at: "€",
  be: "€",
  ch: "CHF ",
  de: "€",
  es: "€",
  fr: "€",
  in: "₹",
  it: "€",
  mx: "MX$",
  nl: "€",
  pl: "zł",
  ru: "₽",
  br: "R$",
  za: "R",
};

/** Formats salary min/max for display. Returns null if neither value exists. */
export function formatSalaryRange(
  salaryMin?: number,
  salaryMax?: number,
  country?: string
): string | null {
  const min = salaryMin != null && salaryMin > 0 ? salaryMin : undefined;
  const max = salaryMax != null && salaryMax > 0 ? salaryMax : undefined;
  if (min == null && max == null) return null;
  const prefix = country ? CURRENCY_BY_COUNTRY[country.toLowerCase()] ?? "" : "";
  const fmtNum = (n: number) =>
    n.toLocaleString("en-SG", { maximumFractionDigits: 0 });
  const fmt = (n: number) => prefix + fmtNum(n);
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)} – ${prefix}${fmtNum(max)}`;
  }
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return null;
}
