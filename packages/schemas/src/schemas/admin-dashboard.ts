/**
 * Admin dashboard schemas: aggregated metrics (no PII) and AI-generated summary for the admin overview.
 */

import { z } from "zod";

/** Aggregated dashboard metrics for admin overview; no PII. */
export const DashboardMetricsSchema = z.object({
  totalUsers: z.number(),
  totalSummaries: z.number(),
  totalViews: z.number(),
  totalSaves: z.number(),
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

/** User growth bucket: new users per day (last 7 days). */
export const UserGrowthBucketSchema = z.object({
  date: z.string(),
  count: z.number(),
});
export type UserGrowthBucket = z.infer<typeof UserGrowthBucketSchema>;

/** Popular listing row: listing id with view and save counts (last 7 days for views). */
export const PopularListingItemSchema = z.object({
  listingId: z.string(),
  viewCount: z.number(),
  saveCount: z.number(),
});
export type PopularListingItem = z.infer<typeof PopularListingItemSchema>;

/** Recent user row for dashboard: id, optional username, name, createdAt. */
export const RecentUserSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  name: z.string(),
  createdAt: z.coerce.date(),
});
export type RecentUser = z.infer<typeof RecentUserSchema>;

/** Full admin dashboard API response: metrics, summary, user growth, popular listings, recent users. */
export const AdminDashboardResponseSchema = z.object({
  metrics: DashboardMetricsSchema,
  summary: z.string(),
  userGrowth: z.array(UserGrowthBucketSchema),
  popularListings: z.array(PopularListingItemSchema),
  recentUsers: z.array(RecentUserSchema),
});

export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseSchema>;
