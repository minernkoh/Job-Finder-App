/**
 * Saved listing schemas: API response shape and POST body for saving a listing.
 */

import { z } from "zod";

/** API response shape for a saved listing (id, listingId, snapshot fields, savedAt). */
export const SavedListingResultSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  country: z.string().optional(),
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
});

export type SaveListingBody = z.infer<typeof SaveListingBodySchema>;
