/**
 * Admin dashboard service: aggregates metrics from DB, generates an AI narrative summary via Gemini, and caches the summary in memory.
 */

import { generateObject } from "ai";
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
import {
  executeWithGeminiFallback,
  retryWithBackoff,
} from "@/lib/ai/gemini";
import { getEnv } from "@/lib/env";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import { Listing } from "@/lib/models/Listing";
import { ListingView } from "@/lib/models/ListingView";

const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let summaryCache: { summary: string; expiresAt: number } | null = null;

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
  const listingIds = viewCounts.map((v) => v._id);
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title")
    .lean();
  const titleMap = new Map(
    listings.map((l) => {
      const doc = l as { _id: mongoose.Types.ObjectId; title?: string };
      const title = doc.title?.trim();
      return [doc._id.toString(), title ? title : undefined];
    })
  );
  return viewCounts
    .map((v) => {
      const idStr = v._id.toString();
      return {
        listingId: idStr,
        title: titleMap.get(idStr),
        viewCount: v.count,
        saveCount: saveMap.get(idStr) ?? 0,
      };
    })
    .filter((item) => item.title != null && item.title.length > 0);
}

const RECENT_USERS_LIMIT = 15;

/** Returns the most recently created users (id, username, createdAt) for the dashboard. */
export async function getDashboardRecentUsers(): Promise<RecentUser[]> {
  await connectDB();
  const docs = await User.find()
    .select("username createdAt")
    .sort({ createdAt: -1 })
    .limit(RECENT_USERS_LIMIT)
    .lean();
  return docs.map((u) => ({
    id: (u as { _id: mongoose.Types.ObjectId })._id.toString(),
    username: (u as { username: string }).username,
    createdAt: (u as { createdAt: Date }).createdAt,
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
        executeWithGeminiFallback((model) =>
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
