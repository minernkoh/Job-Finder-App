/**
 * Admin dashboard service: aggregates metrics from DB, generates an AI narrative summary via Gemini, and caches the summary in memory.
 */

import { generateObject, streamObject } from "ai";
import {
  type DashboardMetrics,
  DashboardSummarySchema,
  type DashboardSummary,
  type AdminDashboardResponse,
  type UserGrowthBucket,
  type PopularListingItem,
  type RecentUser,
} from "@schemas";
import { getSql } from "@/lib/db";
import {
  executeWithGemini,
  retryWithBackoff,
} from "@/lib/ai/gemini";
import { getEnv } from "@/lib/env";

const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let summaryCache: { summary: string; expiresAt: number } | null = null;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Aggregates dashboard metrics from DB (counts; no PII). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = getSql();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [row] = (await sql`
    select
      (select count(*)::int from users) as total_users,
      (select count(*)::int from ai_summaries) as total_summaries,
      (select count(*)::int from listing_views) as total_views,
      (select count(*)::int from saved_listings) as total_saves,
      (select count(*)::int from ai_summaries where created_at >= ${sevenDaysAgo}) as summaries_last7_days,
      (select count(*)::int from users where created_at >= ${sevenDaysAgo}) as users_last7_days,
      (select count(*)::int from listing_views where viewed_at >= ${sevenDaysAgo}) as views_last7_days,
      (select count(*)::int from saved_listings where created_at >= ${sevenDaysAgo}) as saves_last7_days,
      (
        select count(*)::int from (
          select user_id from ai_summaries where created_at >= ${sevenDaysAgo}
          union
          select user_id from saved_listings where created_at >= ${sevenDaysAgo}
        ) active
      ) as active_users_last7_days
  `) as unknown as Array<{
    totalUsers: number;
    totalSummaries: number;
    totalViews: number;
    totalSaves: number;
    summariesLast7Days: number;
    usersLast7Days: number;
    viewsLast7Days: number;
    savesLast7Days: number;
    activeUsersLast7Days: number;
  }>;

  return row;
}

/** Returns new users per day for the last 7 days (for dashboard analytics). */
export async function getDashboardUserGrowth(): Promise<UserGrowthBucket[]> {
  const sql = getSql();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const rows = (await sql`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date, count(*)::int as count
    from users
    where created_at >= ${sevenDaysAgo}
    group by 1
    order by 1
  `) as unknown as Array<{ date: string; count: number }>;
  return rows.map((d) => ({ date: d.date, count: d.count }));
}

/** Returns popular listings by view count (last 7 days) with save counts. */
export async function getDashboardPopularListings(): Promise<PopularListingItem[]> {
  const sql = getSql();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const rows = (await sql`
    select v.listing_id, l.title, v.view_count, coalesce(s.save_count, 0)::int as save_count
    from (
      select listing_id, count(*)::int as view_count
      from listing_views
      where viewed_at >= ${sevenDaysAgo}
      group by listing_id
      order by view_count desc
      limit 20
    ) v
    left join listings l on l.id = v.listing_id
    left join (
      select listing_id, count(*)::int as save_count
      from saved_listings
      group by listing_id
    ) s on s.listing_id = v.listing_id
    order by v.view_count desc
  `) as unknown as Array<{
    listingId: string;
    title?: string;
    viewCount: number;
    saveCount: number;
  }>;
  return rows
    .map((r) => ({
      listingId: r.listingId,
      title: r.title?.trim() ? r.title.trim() : undefined,
      viewCount: r.viewCount,
      saveCount: r.saveCount,
    }))
    .filter((item) => item.title != null && item.title.length > 0);
}

const RECENT_USERS_LIMIT = 15;

/** Returns the most recently created users (id, username, createdAt) for the dashboard. */
export async function getDashboardRecentUsers(): Promise<RecentUser[]> {
  const sql = getSql();
  const rows = (await sql`
    select id, username, created_at
    from users
    order by created_at desc
    limit ${RECENT_USERS_LIMIT}
  `) as unknown as Array<{ id: string; username: string; createdAt: Date }>;
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
  }));
}

/** Generates a short executive summary of the metrics using Gemini. Returns fallback string if AI is unavailable. */
export async function generateDashboardSummary(
  metrics: DashboardMetrics
): Promise<string> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return "Summary unavailable; configure GEMINI_API_KEY.";
  }

  const prompt = `Given these dashboard metrics for a job-finder app, write a 2–4 sentence executive summary for an admin. Be factual and neutral. Do not invent numbers. Use only the metrics provided.

Metrics (JSON):
${JSON.stringify(metrics, null, 2)}`;

  try {
    const { object } = await retryWithBackoff(
      () =>
        executeWithGemini((model) =>
          generateObject({ model, schema: DashboardSummarySchema, prompt }),
        ),
      {
        fallbackMessage:
          "Summary temporarily unavailable; please try again later.",
      },
    );
    return object.summary;
  } catch {
    return "Summary temporarily unavailable; please try again later.";
  }
}

export interface DashboardStreamResult {
  partialObjectStream: AsyncIterable<Partial<DashboardSummary>>;
  object: Promise<DashboardSummary>;
}

/** Streams the dashboard executive summary using Gemini via streamObject. Same prompt as generateDashboardSummary. Throws if GEMINI_API_KEY is not set. */
export async function generateDashboardSummaryStream(
  metrics: DashboardMetrics,
): Promise<DashboardStreamResult> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error("AI summarization is not configured");
  }

  const prompt = `Given these dashboard metrics for a job-finder app, write a 2–4 sentence executive summary for an admin. Be factual and neutral. Do not invent numbers. Use only the metrics provided.

Metrics (JSON):
${JSON.stringify(metrics, null, 2)}`;

  return executeWithGemini((model) => {
    const result = streamObject({
      model,
      schema: DashboardSummarySchema,
      prompt,
    });
    return Promise.resolve({
      partialObjectStream: result.partialObjectStream as AsyncIterable<
        Partial<DashboardSummary>
      >,
      object: result.object as Promise<DashboardSummary>,
    });
  });
}

/** Returns metrics, user growth, popular listings, and recent users only (no AI summary). Use for fast initial dashboard load. */
export async function getDashboardWithoutSummary(): Promise<
  Omit<AdminDashboardResponse, "summary">
> {
  const [metrics, userGrowth, popularListings, recentUsers] = await Promise.all([
    getDashboardMetrics(),
    getDashboardUserGrowth(),
    getDashboardPopularListings(),
    getDashboardRecentUsers(),
  ]);
  return {
    metrics,
    userGrowth,
    popularListings,
    recentUsers,
  };
}

/** Returns only the AI-generated dashboard summary; uses in-memory cache unless skipCache is true. Fetches metrics for the prompt. */
export async function getDashboardSummaryOnly(options?: {
  skipCache?: boolean;
}): Promise<string> {
  const now = Date.now();
  const useCache =
    !options?.skipCache && summaryCache && summaryCache.expiresAt > now;

  if (useCache) {
    return summaryCache!.summary;
  }
  const metrics = await getDashboardMetrics();
  const summary = await generateDashboardSummary(metrics);
  summaryCache = {
    summary,
    expiresAt: now + SUMMARY_CACHE_TTL_MS,
  };
  return summary;
}

/** Returns metrics, user growth, popular listings, recent users, and AI summary; uses in-memory cache for summary unless skipCache is true. */
export async function getDashboardWithSummary(options?: {
  skipCache?: boolean;
}): Promise<AdminDashboardResponse> {
  const [metrics, userGrowth, popularListings, recentUsers] = await Promise.all([
    getDashboardMetrics(),
    getDashboardUserGrowth(),
    getDashboardPopularListings(),
    getDashboardRecentUsers(),
  ]);
  const now = Date.now();
  const useCache =
    !options?.skipCache && summaryCache && summaryCache.expiresAt > now;

  let summary: string;
  if (useCache) {
    summary = summaryCache!.summary;
  } else {
    summary = await generateDashboardSummary(metrics);
    summaryCache = {
      summary,
      expiresAt: now + SUMMARY_CACHE_TTL_MS,
    };
  }

  return {
    metrics,
    summary,
    userGrowth,
    popularListings,
    recentUsers,
  };
}
