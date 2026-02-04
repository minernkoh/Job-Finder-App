/**
 * AI summary schema: TL;DR, responsibilities, requirements, SG signals (salary, SkillsFuture), and optional JD–skillset match.
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
  /** SG signal: SkillsFuture keywords */
  skillsFutureKeywords: z.array(z.string()).optional(),
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
  })
  .refine(
    (data) =>
      (data.listingId?.length ?? 0) > 0 ||
      (data.text?.length ?? 0) > 0 ||
      (data.url?.length ?? 0) > 0,
    { message: "At least one of listingId, text, or url is required" }
  );

export type CreateSummaryBody = z.infer<typeof CreateSummaryBodySchema>;
