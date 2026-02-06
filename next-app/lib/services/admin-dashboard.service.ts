/**
 * Admin dashboard service: aggregates metrics from DB, generates an AI narrative summary via Gemini, and caches the summary in memory.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  type DashboardMetrics,
  DashboardSummarySchema,
  type AdminDashboardResponse,
  type WordCloudTerm,
  type AISummaryMetrics,
  type JDMatchMetrics,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import { ListingView } from "@/lib/models/ListingView";
import { UserProfile } from "@/lib/models/UserProfile";

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

/** Aggregates dashboard metrics from DB (counts; no PII). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalSummaries,
    summariesLast7Days,
    usersLast7Days,
    viewsLast7Days,
    savesLast7Days,
    summaryUserIds,
    saveUserIds,
  ] = await Promise.all([
    User.countDocuments(),
    AISummary.countDocuments(),
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
    summariesLast7Days,
    usersLast7Days,
    viewsLast7Days,
    savesLast7Days,
    activeUsersLast7Days: activeUserIds.size,
  };
}

const WORD_CLOUD_TOP = 80;

/** Aggregates skills/keywords from UserProfile and AISummary into term counts; returns top N terms. */
export async function getWordCloudData(): Promise<WordCloudTerm[]> {
  await connectDB();
  const termCounts = new Map<string, number>();

  const addTerms = (terms: string[] | undefined) => {
    if (!terms) return;
    for (const t of terms) {
      const w = t.trim().toLowerCase();
      if (w.length < 2) continue;
      termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
    }
  };

  const [profiles, summaries] = await Promise.all([
    UserProfile.find({}).select("skills jobTitles").lean(),
    AISummary.find({}).select("requirements niceToHaves jdMatch").lean(),
  ]);

  for (const p of profiles) {
    addTerms(p.skills);
    addTerms(p.jobTitles);
  }
  for (const s of summaries) {
    addTerms(s.requirements);
    addTerms(s.niceToHaves);
    const jd = s as {
      jdMatch?: { matchedSkills?: string[]; missingSkills?: string[] };
    };
    addTerms(jd.jdMatch?.matchedSkills);
    addTerms(jd.jdMatch?.missingSkills);
  }

  const sorted = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, WORD_CLOUD_TOP)
    .map(([word, count]) => ({ word, count }));
  return sorted;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** AI summary counts and field-population metrics. */
export async function getAISummaryMetrics(): Promise<AISummaryMetrics> {
  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const [
    total,
    last7Days,
    withSalarySgd,
    withJdMatch,
    withKeyResponsibilities,
    withRequirements,
  ] = await Promise.all([
    AISummary.countDocuments(),
    AISummary.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    AISummary.countDocuments({
      salarySgd: { $exists: true, $nin: [null, ""] },
    }),
    AISummary.countDocuments({
      "jdMatch.matchScore": { $exists: true, $ne: null },
    }),
    AISummary.countDocuments({
      keyResponsibilities: { $exists: true, $type: "array", $ne: [] },
    }),
    AISummary.countDocuments({
      requirements: { $exists: true, $type: "array", $ne: [] },
    }),
  ]);
  return {
    total,
    last7Days,
    withSalarySgd,
    withJdMatch,
    withKeyResponsibilities,
    withRequirements,
  };
}

/** JD–skillset match score distribution (count with/without, avg, median, optional buckets). */
export async function getJDMatchMetrics(): Promise<JDMatchMetrics> {
  await connectDB();
  const withMatch = await AISummary.find({
    "jdMatch.matchScore": { $exists: true, $ne: null },
  })
    .select("jdMatch.matchScore")
    .lean();
  const countWithoutMatch = await AISummary.countDocuments({
    $or: [
      { "jdMatch.matchScore": { $exists: false } },
      { "jdMatch.matchScore": null },
    ],
  });
  const scores = withMatch
    .map(
      (s) => (s as { jdMatch?: { matchScore?: number } }).jdMatch?.matchScore
    )
    .filter((n): n is number => typeof n === "number");
  const countWithMatch = scores.length;
  let avgScore: number | undefined;
  let medianScore: number | undefined;
  if (scores.length > 0) {
    avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    medianScore = sorted[Math.floor(sorted.length / 2)] ?? undefined;
  }
  const scoreBuckets = [
    { min: 0, max: 25, count: scores.filter((s) => s >= 0 && s <= 25).length },
    {
      min: 26,
      max: 50,
      count: scores.filter((s) => s >= 26 && s <= 50).length,
    },
    {
      min: 51,
      max: 75,
      count: scores.filter((s) => s >= 51 && s <= 75).length,
    },
    {
      min: 76,
      max: 100,
      count: scores.filter((s) => s >= 76 && s <= 100).length,
    },
  ];
  return {
    countWithMatch,
    countWithoutMatch,
    avgScore,
    medianScore,
    scoreBuckets,
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

/** Returns metrics, word cloud, AI/JD metrics, and AI summary; uses in-memory cache for summary unless skipCache is true. */
export async function getDashboardWithSummary(options?: {
  skipCache?: boolean;
}): Promise<AdminDashboardResponse> {
  const [metrics, wordCloud, aiSummaryMetrics, jdMatchMetrics] =
    await Promise.all([
      getDashboardMetrics(),
      getWordCloudData(),
      getAISummaryMetrics(),
      getJDMatchMetrics(),
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
    wordCloud,
    aiSummaryMetrics,
    jdMatchMetrics,
    summary,
  };
}
