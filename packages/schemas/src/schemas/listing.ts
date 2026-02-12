/**
 * Job listing schema: title, company, location, and optional fields (Adzuna source, country, etc.).
 */

import { z } from "zod";

export const ListingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  source: z.literal("adzuna").default("adzuna"),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().min(1, "sourceId is required"),
  expiresAt: z.coerce.date(),
  country: z.string().length(2).default("sg"),
  postedAt: z.coerce.date().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
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

/** Body for admin creating a listing (sourceId/expiresAt set server-side). */
export const ListingCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  country: z.string().length(2).optional().default("sg"),
  sourceUrl: z.string().url().optional(),
});
export type ListingCreate = z.infer<typeof ListingCreateSchema>;

/** Body for admin updating a listing (partial; only these fields may be updated). */
export const ListingUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  country: z.string().length(2).optional(),
  sourceUrl: z.string().url().optional().nullable(),
});
export type ListingUpdate = z.infer<typeof ListingUpdateSchema>;

/** Query params for admin GET listings list (pagination). */
export const AdminListingsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type AdminListingsQuery = z.infer<typeof AdminListingsQuerySchema>;
