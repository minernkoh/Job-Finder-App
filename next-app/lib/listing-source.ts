/**
 * Display labels for listing sources.
 */

import type { ListingSource } from "@schemas";

export function listingSourceLabel(source: ListingSource | string | undefined): string | null {
  if (source === "mcf") return "MyCareersFuture";
  if (source === "manual") return "Manual";
  if (source === "adzuna") return "Adzuna";
  return null;
}
