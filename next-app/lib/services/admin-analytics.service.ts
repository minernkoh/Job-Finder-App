/**
 * Admin analytics service: user growth buckets, summary stats, popular listings, word cloud and AI/JD metrics for analytics dashboard.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import { ListingView } from "@/lib/models/ListingView";
import {
  getWordCloudData,
  getAISummaryMetrics,
  getJDMatchMetrics,
} from "./admin-dashboard.service";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface UserGrowthBucket {
  date: string;
  count: number;
}

export interface PopularListingItem {
  listingId: string;
  viewCount: number;
  saveCount: number;
}

export interface AnalyticsResult {
  userGrowth: UserGrowthBucket[];
  summaryStats: { total: number; last7Days: number };
  popularListings: PopularListingItem[];
  wordCloud: Array<{ word: string; count: number }>;
  aiSummaryMetrics: Awaited<ReturnType<typeof getAISummaryMetrics>>;
  jdMatchMetrics: Awaited<ReturnType<typeof getJDMatchMetrics>>;
}

/** Returns analytics payload: user growth by day, summary stats, popular listings, word cloud, AI/JD metrics. */
export async function getAnalytics(): Promise<AnalyticsResult> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [userGrowthDocs, totalSummaries, summariesLast7Days, wordCloud, aiSummaryMetrics, jdMatchMetrics] =
    await Promise.all([
      User.aggregate<{ _id: { day: string }; count: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AISummary.countDocuments(),
      AISummary.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      getWordCloudData(),
      getAISummaryMetrics(),
      getJDMatchMetrics(),
    ]);

  const viewCounts = await ListingView.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { viewedAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  const saveCounts = await SavedListing.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  const saveMap = new Map(saveCounts.map((s) => [s._id.toString(), s.count]));
  const popularListings: PopularListingItem[] = viewCounts.map((v) => ({
    listingId: v._id.toString(),
    viewCount: v.count,
    saveCount: saveMap.get(v._id.toString()) ?? 0,
  }));

  const userGrowth: UserGrowthBucket[] = userGrowthDocs.map((d) => ({
    date: d._id.day,
    count: d.count,
  }));

  return {
    userGrowth,
    summaryStats: { total: totalSummaries, last7Days: summariesLast7Days },
    popularListings,
    wordCloud,
    aiSummaryMetrics,
    jdMatchMetrics,
  };
}
