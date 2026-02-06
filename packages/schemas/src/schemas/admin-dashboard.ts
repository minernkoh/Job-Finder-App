/**
 * Admin dashboard schemas: aggregated metrics (no PII) and AI-generated summary for the admin overview.
 */

import { z } from "zod";

/** Aggregated dashboard metrics for admin overview; no PII. */
export const DashboardMetricsSchema = z.object({
  totalUsers: z.number(),
  totalSummaries: z.number(),
  summariesLast7Days: z.number(),
  usersLast7Days: z.number(),
  viewsLast7Days: z.number(),
  savesLast7Days: z.number(),
  activeUsersLast7Days: z.number().optional(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

/** AI-generated narrative summary of dashboard metrics. */
export const DashboardSummarySchema = z.object({
  summary: z.string(),
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

/** Word cloud term (word and count). */
export const WordCloudTermSchema = z.object({
  word: z.string(),
  count: z.number(),
});
export type WordCloudTerm = z.infer<typeof WordCloudTermSchema>;

/** AI summary usage and field-population metrics. */
export const AISummaryMetricsSchema = z.object({
  total: z.number(),
  last7Days: z.number(),
  withSalarySgd: z.number(),
  withJdMatch: z.number(),
  withKeyResponsibilities: z.number(),
  withRequirements: z.number(),
});
export type AISummaryMetrics = z.infer<typeof AISummaryMetricsSchema>;

/** JD–skillset match score distribution and counts. */
export const JDMatchMetricsSchema = z.object({
  countWithMatch: z.number(),
  countWithoutMatch: z.number(),
  avgScore: z.number().optional(),
  medianScore: z.number().optional(),
  scoreBuckets: z.array(z.object({ min: z.number(), max: z.number(), count: z.number() })).optional(),
});
export type JDMatchMetrics = z.infer<typeof JDMatchMetricsSchema>;

/** Full admin dashboard API response: metrics, optional word cloud and AI/JD metrics, plus summary. */
export const AdminDashboardResponseSchema = z.object({
  metrics: DashboardMetricsSchema,
  wordCloud: z.array(WordCloudTermSchema).optional(),
  aiSummaryMetrics: AISummaryMetricsSchema.optional(),
  jdMatchMetrics: JDMatchMetricsSchema.optional(),
  summary: z.string(),
});

export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseSchema>;
