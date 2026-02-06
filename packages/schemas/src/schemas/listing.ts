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

/** API response shape for a single listing (id, title, company, etc.). */
export const ListingResultSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  source: z.literal("adzuna"),
  sourceUrl: z.string().url().optional(),
  country: z.string(),
  /** Minimum salary when available from Adzuna (numeric, local currency). */
  salaryMin: z.number().optional(),
  /** Maximum salary when available from Adzuna (numeric, local currency). */
  salaryMax: z.number().optional(),
  /** When the job was posted (from Adzuna created). Optional; not all jobs include it. */
  postedAt: z.coerce.date().optional(),
});

export type ListingResult = z.infer<typeof ListingResultSchema>;

/** Query params for admin GET listings list (pagination). */
export const AdminListingsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type AdminListingsQuery = z.infer<typeof AdminListingsQuerySchema>;
