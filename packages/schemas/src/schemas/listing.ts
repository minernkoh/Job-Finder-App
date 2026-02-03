/**
 * Job listing schema: title, company, location, and optional fields (Adzuna source, country, etc.).
 */

import { z } from "zod";

export const ListingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  // Optional Adzuna integration fields
  source: z.literal("adzuna").optional(),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  cacheKey: z.string().optional(),
  country: z.string().length(2).optional().default("sg"),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type Listing = z.infer<typeof ListingSchema>;
