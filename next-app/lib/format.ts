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

/** Formats a job posted date for display: relative for recent, absolute for older. Returns null if no valid date. */
export function formatPostedDate(
  date: Date | string | undefined
): string | null {
  if (date == null) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return "Today";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
