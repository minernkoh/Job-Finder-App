/**
 * Saved listing schemas: API response shape and POST body for saving a listing.
 */

import { z } from "zod";
import { LISTING_SOURCES } from "./listing";

/** API response shape for a saved listing (id, listingId, snapshot fields, savedAt). */
export const SavedListingResultSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  country: z.string().optional(),
  /** Job source; optional for back-compat with saved docs predating multi-source. */
  source: z.enum(LISTING_SOURCES).optional(),
  savedAt: z.string(),
});

export type SavedListingResult = z.infer<typeof SavedListingResultSchema>;

/** POST body schema for saving a listing (used by API route and service). */
export const SaveListingBodySchema = z.object({
  listingId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  country: z.string().optional(),
  source: z.enum(LISTING_SOURCES).optional(),
});

export type SaveListingBody = z.infer<typeof SaveListingBodySchema>;
