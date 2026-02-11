/**
 * AI summary schema: TL;DR, responsibilities, requirements, SG signals (salary), and optional JD–skillset match.
 */

import { z } from "zod";

/** JD–user skillset match (optional; requires user profile/skills). */
export const JDMatchSchema = z
  .object({
    matchScore: z.number().min(0).max(100).optional(),
    matchedSkills: z.array(z.string()).optional(),
    missingSkills: z.array(z.string()).optional(),
  })
  .optional();

export const AISummarySchema = z.object({
  tldr: z.string(),
  keyResponsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  niceToHaves: z.array(z.string()).optional(),
  /** SG signal: salary in SGD extracted by AI from description */
  salarySgd: z.string().optional(),
  /** JD–user skillset match (optional) */
  jdMatch: JDMatchSchema,
  caveats: z.array(z.string()).optional(),
  /** Hash of input text for caching / deduplication. */
  inputTextHash: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type AISummary = z.infer<typeof AISummarySchema>;

/** POST body for create summary: at least one of listingId, text, or url required. */
export const CreateSummaryBodySchema = z
  .object({
    listingId: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    url: z.string().url().optional(),
    /** When true, skip cache and always generate a new summary. */
    forceRegenerate: z.boolean().optional(),
  })
  .refine(
    (data) =>
      (data.listingId?.length ?? 0) > 0 ||
      (data.text?.length ?? 0) > 0 ||
      (data.url?.length ?? 0) > 0,
    { message: "At least one of listingId, text, or url is required" }
  );

export type CreateSummaryBody = z.infer<typeof CreateSummaryBodySchema>;

/** Per-listing skills match: match score and skills breakdown (when user has skills). */
export const ListingMatchScoreSchema = z.object({
  listingId: z.string(),
  matchScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()).optional(),
  missingSkills: z.array(z.string()).optional(),
});

/** AI-generated comparison of 2–3 job listings: similarities, differences, summary, and optional recommendation. */
export const ComparisonSummarySchema = z.object({
  summary: z.string(),
  /** Shared traits or common aspects across the listings. */
  similarities: z.array(z.string()).optional(),
  /** Key differences (e.g. seniority, focus, salary, location). */
  differences: z.array(z.string()).optional(),
  comparisonPoints: z.array(z.string()).optional(),
  recommendedListingId: z.string().optional(),
  recommendationReason: z.string().optional(),
  /** Per-listing match to user skills (when user has skills). */
  listingMatchScores: z.array(ListingMatchScoreSchema).optional(),
});

export type ComparisonSummary = z.infer<typeof ComparisonSummarySchema>;

/** POST body for compare summaries: exactly 2 or 3 listing IDs. */
export const CompareSummaryBodySchema = z.object({
  listingIds: z.array(z.string().min(1)).min(2).max(3),
});

export type CompareSummaryBody = z.infer<typeof CompareSummaryBodySchema>;

/** Query params for admin GET summaries list (pagination and optional user filter). */
export const AdminSummariesQuerySchema = z.object({
  userId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
});
export type AdminSummariesQuery = z.infer<typeof AdminSummariesQuerySchema>;
