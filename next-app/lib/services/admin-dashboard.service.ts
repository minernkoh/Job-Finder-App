/**
 * Admin dashboard service: aggregates metrics from DB, generates an AI narrative summary via Gemini, and caches the summary in memory.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  type DashboardMetrics,
  DashboardSummarySchema,
  type AdminDashboardResponse,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { User } from "@/lib/models/User";
import { Listing } from "@/lib/models/Listing";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";

const SUMMARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const TOP_SKILLS_LIMIT = 10;

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

/** Aggregates dashboard metrics from DB (counts and optional top SkillsFuture keywords). No PII. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalListings,
    totalSummaries,
    totalSavedListings,
    summariesLast7Days,
    usersLast7Days,
    topKeywordsResult,
  ] = await Promise.all([
    User.countDocuments(),
    Listing.countDocuments(),
    AISummary.countDocuments(),
    SavedListing.countDocuments(),
    AISummary.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    AISummary.aggregate<{ _id: string; count: number }>([
      { $unwind: "$skillsFutureKeywords" },
      { $match: { skillsFutureKeywords: { $exists: true, $ne: "" } } },
      { $group: { _id: "$skillsFutureKeywords", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: TOP_SKILLS_LIMIT },
    ]).exec(),
  ]);

  const topSkillsFutureKeywords = topKeywordsResult.map((r) => r._id);

  return {
    totalUsers,
    totalListings,
    totalSummaries,
    totalSavedListings,
    summariesLast7Days,
    usersLast7Days,
    topSkillsFutureKeywords:
      topSkillsFutureKeywords.length > 0 ? topSkillsFutureKeywords : undefined,
  };
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

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: DashboardSummarySchema,
        prompt,
      });
      return object.summary;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return "Summary temporarily unavailable; please try again later.";
}

/** Returns metrics and AI summary; uses in-memory cache for summary unless skipCache is true. */
export async function getDashboardWithSummary(
  options?: { skipCache?: boolean }
): Promise<AdminDashboardResponse> {
  const metrics = await getDashboardMetrics();
  const now = Date.now();
  const useCache =
    !options?.skipCache &&
    summaryCache &&
    summaryCache.expiresAt > now;

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

  return { metrics, summary };
}
