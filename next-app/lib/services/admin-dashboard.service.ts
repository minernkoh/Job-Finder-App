/**
 * Admin dashboard service: aggregates metrics from DB, generates an AI narrative summary via Gemini, and caches the summary in memory.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import mongoose from "mongoose";
import {
  type DashboardMetrics,
  DashboardSummarySchema,
  type AdminDashboardResponse,
  type UserGrowthBucket,
  type PopularListingItem,
  type RecentUser,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import { ListingView } from "@/lib/models/ListingView";

const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

let summaryCache: { summary: string; expiresAt: number } | null = null;

/** Returns Gemini model for dashboard summary, or null if GEMINI_API_KEY is not set. */
function getGeminiModelForDashboard(): ReturnType<
  ReturnType<typeof createGoogleGenerativeAI>
> | null {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) return null;
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Aggregates dashboard metrics from DB (counts; no PII). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [
    totalUsers,
    totalSummaries,
    totalViews,
    totalSaves,
    summariesLast7Days,
    usersLast7Days,
    viewsLast7Days,
    savesLast7Days,
    summaryUserIds,
    saveUserIds,
  ] = await Promise.all([
    User.countDocuments(),
    AISummary.countDocuments(),
    ListingView.countDocuments(),
    SavedListing.countDocuments(),
    AISummary.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ListingView.countDocuments({ viewedAt: { $gte: sevenDaysAgo } }),
    SavedListing.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    AISummary.distinct("userId", { createdAt: { $gte: sevenDaysAgo } }),
    SavedListing.distinct("userId", { createdAt: { $gte: sevenDaysAgo } }),
  ]);

  const activeUserIds = new Set([
    ...summaryUserIds.map((id) => id.toString()),
    ...saveUserIds.map((id) => id.toString()),
  ]);

  return {
    totalUsers,
    totalSummaries,
    totalViews,
    totalSaves,
    summariesLast7Days,
    usersLast7Days,
    viewsLast7Days,
    savesLast7Days,
    activeUsersLast7Days: activeUserIds.size,
  };
}

/** Returns new users per day for the last 7 days (for dashboard analytics). */
export async function getDashboardUserGrowth(): Promise<UserGrowthBucket[]> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const docs = await User.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return docs.map((d) => ({ date: d._id, count: d.count }));
}

/** Returns popular listings by view count (last 7 days) with save counts. */
export async function getDashboardPopularListings(): Promise<PopularListingItem[]> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const viewCounts = await ListingView.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $match: { viewedAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  const saveCounts = await SavedListing.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  const saveMap = new Map(saveCounts.map((s) => [s._id.toString(), s.count]));
  return viewCounts.map((v) => ({
    listingId: v._id.toString(),
    viewCount: v.count,
    saveCount: saveMap.get(v._id.toString()) ?? 0,
  }));
}

const RECENT_USERS_LIMIT = 15;

/** Returns the most recently created users (id, username, name, createdAt) for the dashboard. */
export async function getDashboardRecentUsers(): Promise<RecentUser[]> {
  await connectDB();
  const docs = await User.find()
    .select("username name createdAt")
    .sort({ createdAt: -1 })
    .limit(RECENT_USERS_LIMIT)
    .lean();
  return docs.map((u) => ({
    id: (u as { _id: mongoose.Types.ObjectId })._id.toString(),
    username: (u as { username?: string }).username,
    name: (u as { name: string }).name,
    createdAt: (u as { createdAt: Date }).createdAt,
  }));
}

/** Generates a short executive summary of the metrics using Gemini. Returns fallback string if AI is unavailable. */
export async function generateDashboardSummary(
  metrics: DashboardMetrics
): Promise<string> {
  const model = getGeminiModelForDashboard();
  if (!model) {
    return "Summary unavailable; configure GEMINI_API_KEY.";
  }

  const prompt = `Given these dashboard metrics for a job-finder app, write a 2–4 sentence executive summary for an admin. Be factual and neutral. Do not invent numbers. Use only the metrics provided.

Metrics (JSON):
${JSON.stringify(metrics, null, 2)}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: DashboardSummarySchema,
        prompt,
      });
      return object.summary;
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return "Summary temporarily unavailable; please try again later.";
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
