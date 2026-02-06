/**
 * Admin analytics page: user growth, summary stats, popular listings, word cloud, AI summary and JD match metrics.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components";

interface AnalyticsData {
  userGrowth: Array<{ date: string; count: number }>;
  summaryStats: { total: number; last7Days: number };
  popularListings: Array<{ listingId: string; viewCount: number; saveCount: number }>;
  wordCloud: Array<{ word: string; count: number }>;
  aiSummaryMetrics: {
    total: number;
    last7Days: number;
    withSalarySgd: number;
    withJdMatch: number;
    withKeyResponsibilities: number;
    withRequirements: number;
  };
  jdMatchMetrics: {
    countWithMatch: number;
    countWithoutMatch: number;
    avgScore?: number;
    medianScore?: number;
    scoreBuckets?: Array<{ min: number; max: number; count: number }>;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: AnalyticsData }>(
        "/api/v1/admin/analytics"
      );
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError("Failed to load analytics");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="p-4">
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { userGrowth, summaryStats, popularListings, wordCloud, aiSummaryMetrics, jdMatchMetrics } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User growth (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth.length === 0 ? (
              <p className="text-muted-foreground text-sm">No new users in the last 7 days.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {userGrowth.map((d) => (
                  <li key={d.date} className="flex justify-between">
                    <span className="text-foreground">{d.date}</span>
                    <span className="font-medium text-foreground">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Summary stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              Total: <strong>{summaryStats.total}</strong>
            </p>
            <p className="text-muted-foreground text-sm">
              Last 7 days: {summaryStats.last7Days}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Word cloud (skills/keywords)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {wordCloud.slice(0, 50).map((t) => (
              <span
                key={t.word}
                className="rounded-md bg-muted px-2 py-0.5 text-sm text-foreground"
                style={{ fontSize: `${0.75 + Math.min(t.count / 10, 2) * 0.25}rem` }}
              >
                {t.word} ({t.count})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI summary metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Total: {aiSummaryMetrics.total}</p>
          <p>Last 7 days: {aiSummaryMetrics.last7Days}</p>
          <p>With salary (SGD): {aiSummaryMetrics.withSalarySgd}</p>
          <p>With JD match: {aiSummaryMetrics.withJdMatch}</p>
          <p>With key responsibilities: {aiSummaryMetrics.withKeyResponsibilities}</p>
          <p>With requirements: {aiSummaryMetrics.withRequirements}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>JD–skillset match</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>With match: {jdMatchMetrics.countWithMatch}</p>
          <p>Without match: {jdMatchMetrics.countWithoutMatch}</p>
          {jdMatchMetrics.avgScore != null && (
            <p>Avg score: {jdMatchMetrics.avgScore.toFixed(1)}</p>
          )}
          {jdMatchMetrics.medianScore != null && (
            <p>Median score: {jdMatchMetrics.medianScore}</p>
          )}
          {jdMatchMetrics.scoreBuckets && jdMatchMetrics.scoreBuckets.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Score distribution:</p>
              <ul className="space-y-0.5">
                {jdMatchMetrics.scoreBuckets.map((b) => (
                  <li key={`${b.min}-${b.max}`}>
                    {b.min}–{b.max}: {b.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular listings (views, last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {popularListings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No view data.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {popularListings.slice(0, 10).map((p) => (
                <li key={p.listingId} className="flex justify-between font-mono text-xs">
                  <span className="truncate text-muted-foreground">{p.listingId}</span>
                  <span className="text-foreground">views: {p.viewCount}, saves: {p.saveCount}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
