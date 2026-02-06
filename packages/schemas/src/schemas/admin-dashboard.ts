/**
 * Admin dashboard schemas: aggregated metrics (no PII) and AI-generated summary for the admin overview.
 */

import { z } from "zod";

/** Aggregated dashboard metrics for admin overview; no PII. */
export const DashboardMetricsSchema = z.object({
  totalUsers: z.number(),
  totalListings: z.number(),
  totalSummaries: z.number(),
  totalSavedListings: z.number(),
  summariesLast7Days: z.number(),
  usersLast7Days: z.number(),
  topSkillsFutureKeywords: z.array(z.string()).optional(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

/** AI-generated narrative summary of dashboard metrics. */
export const DashboardSummarySchema = z.object({
  summary: z.string(),
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

/** Full admin dashboard API response: metrics plus summary. */
export const AdminDashboardResponseSchema = z.object({
  metrics: DashboardMetricsSchema,
  summary: z.string(),
});

export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseSchema>;
