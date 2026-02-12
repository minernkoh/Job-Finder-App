/**
 * Compare page: unified AI comparison of 2–3 jobs plus per-job summary columns. Requires ids=id1,id2[,id3]. Auth required for AI.
 */

"use client";

import type { ComparisonSummary } from "@schemas";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@ui/components";
import { sanitizeJobDescription } from "@/lib/sanitize";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModalLink } from "@/components/auth-modal-link";
import { AppHeader } from "@/components/app-header";
import { formatSalaryRange } from "@/lib/format";
import { fetchListing } from "@/lib/api/listings";
import { fetchProfile } from "@/lib/api/profile";
import {
  createComparisonSummary,
  createComparisonSummaryStream,
  consumeComparisonStream,
} from "@/lib/api/summaries";
import {
  isRateLimitMessage,
  isSummaryNotConfiguredMessage,
  SUMMARY_NOT_AVAILABLE_UI_MESSAGE,
} from "@/lib/api/errors";
import { listingKeys, profileKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  CARD_PADDING_DEFAULT,
  CARD_PADDING_DEFAULT_RESPONSIVE,
  CONTENT_MAX_W,
  GAP_MD,
  PAGE_PX,
  SECTION_GAP,
} from "@/lib/layout";
import { EYEBROW_CLASS, EYEBROW_MB } from "@/lib/styles";
import { UserOnlyRoute } from "@/components/user-only-route";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

/** One column: listing meta, description, and link to the full listing page. */
function CompareColumn({ listingId }: { listingId: string }) {
  const { data: listing, isLoading } = useQuery({
    queryKey: listingKeys(listingId),
    queryFn: () => fetchListing(listingId),
  });

  const description = listing?.description ?? "";
  const sanitizedDescription = useMemo(
    () => sanitizeJobDescription(description),
    [description]
  );

  if (isLoading || !listing) {
    return (
      <div className={cn("flex min-h-[20rem] animate-pulse flex-col gap-4 rounded-xl border border-border bg-muted/30", CARD_PADDING_DEFAULT_RESPONSIVE)}>
        <div className="h-6 w-3/4 rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
      </div>
    );
  }

  const salary = formatSalaryRange(
    listing.salaryMin,
    listing.salaryMax,
    listing.country
  );

  return (
    <div className={cn("flex min-h-[20rem] flex-col gap-4 rounded-xl border border-border bg-card", CARD_PADDING_DEFAULT_RESPONSIVE)}>
      <div>
        <h3 className="font-semibold text-foreground">{listing.title}</h3>
        <p className="text-sm text-muted-foreground">{listing.company}</p>
        {listing.location && (
          <p className="text-xs text-muted-foreground">{listing.location}</p>
        )}
        {salary && (
          <p className="mt-1 text-sm font-medium text-foreground">{salary}</p>
        )}
      </div>
      {sanitizedDescription.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Description</h4>
          <div
            className={cn(
              "max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground",
              "[&_a]:text-primary [&_a]:underline [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5"
            )}
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </div>
      )}
      <div className="border-t border-border pt-4">
        <Link
          href={`/browse/${listingId}`}
          className="text-sm text-primary hover:underline"
        >
          Open full page
        </Link>
      </div>
    </div>
  );
}

/** Compare page: reads ids from URL, fetches comparison + listings, renders unified summary and columns. */
function ComparePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading: authLoading } = useAuth();

  const idsParam = searchParams?.get("ids") ?? "";
  const listingIds = useMemo(() => {
    const raw = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.length >= 2 && raw.length <= 3 ? raw : null;
  }, [idsParam]);

  useEffect(() => {
    if (!listingIds) {
      router.replace("/browse");
    }
  }, [listingIds, router]);

  const [comparison, setComparison] = useState<Partial<ComparisonSummary> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [regenerateTrigger, setRegenerateTrigger] = useState(0);
  const streamStartedRef = useRef<string | null>(null);

  const forceRegenerate = regenerateTrigger > 0;

  const handleRetry = useCallback(() => {
    streamStartedRef.current = null;
    setStreamError(null);
    setRetryTrigger((t) => t + 1);
  }, []);

  const handleRegenerate = useCallback(() => {
    streamStartedRef.current = null;
    setStreamError(null);
    setRegenerateTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!listingIds || listingIds.length < 2 || !user || authLoading) return;
    const key =
      listingIds.join(",") + (user.id ?? "") + String(forceRegenerate);
    if (streamStartedRef.current === key) return;
    streamStartedRef.current = key;

    let cancelled = false;
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    setIsStreaming(true);
    setStreamError(null);
    setComparison(null);

    const tryStream = () =>
      createComparisonSummaryStream(listingIds, {
        forceRegenerate,
      }).then((result) => {
        if (result.stream === false) {
          if (!cancelled) setComparison(result.data);
          return result.data;
        }
        activeReader = result.reader;
        return consumeComparisonStream(result.reader, (partial) => {
          if (!cancelled) {
            setComparison((prev) => ({ ...prev, ...partial }));
          }
        });
      });

    const tryFallback = () =>
      createComparisonSummary(listingIds, { forceRegenerate }).then((data) => {
        if (!cancelled) setComparison(data);
      });

    tryStream()
      .catch((err: unknown) => {
        if (cancelled) return;
        return tryFallback().catch((fallbackErr: unknown) => {
          streamStartedRef.current = null;
          let message =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "Failed to load comparison";
          if (isSummaryNotConfiguredMessage(message)) {
            message = SUMMARY_NOT_AVAILABLE_UI_MESSAGE;
          }
          setStreamError(message);
          if (isRateLimitMessage(message)) {
            toast.error(
              "AI summary is temporarily unavailable due to rate limits. Please try again in a few minutes.",
            );
          }
        });
      })
      .finally(() => {
        if (!cancelled) setIsStreaming(false);
      });

    return () => {
      cancelled = true;
      streamStartedRef.current = null;
      activeReader?.cancel();
    };
  }, [listingIds, user, authLoading, retryTrigger, regenerateTrigger, forceRegenerate]);

  const { data: profile } = useQuery({
    queryKey: profileKeys.all,
    queryFn: fetchProfile,
    enabled: !!user,
  });

  if (!listingIds) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader user={user} onLogout={logout} />
        <main id="main-content" className={cn("mx-auto w-full flex-1 py-8", PAGE_PX, CONTENT_MAX_W)}>
          <h1 className="text-2xl font-semibold text-foreground">Compare jobs</h1>
          <p className="mt-2 text-muted-foreground">
            Select 2–3 jobs to compare.{" "}
            <Link href="/browse" className="text-primary hover:underline">
              Back to browse
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={logout} />

      <main id="main-content" className={cn("mx-auto w-full py-8", PAGE_PX, CONTENT_MAX_W, SECTION_GAP)}>
        <h1 className="mb-6 text-2xl font-semibold text-foreground sm:mb-8">
          Comparing {listingIds.length} jobs
        </h1>

        <section aria-label="Unified comparison">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={cn(EYEBROW_CLASS, "mb-0")}>Comparison summary</h2>
            {user && comparison && !isStreaming && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isStreaming}
                className="w-fit"
              >
                <ArrowsClockwiseIcon size={16} className="mr-1" />
                Regenerate summary
              </Button>
            )}
          </div>
          {user && comparison && profile !== undefined && (profile?.skills?.length ?? 0) === 0 && (
            <div className="mb-4 rounded-lg bg-primary/10 p-3 text-foreground">
              <p className="text-sm">
                Add your skills in your profile to get personalized match scores and recommendations.{" "}
                <Link href="/profile" className="text-primary underline hover:opacity-80">
                  Add skills in Profile
                </Link>
              </p>
            </div>
          )}
          {!user && (
            <Card variant="elevated" className={CARD_PADDING_DEFAULT}>
              <h3 className="mb-2 font-medium text-foreground">
                Sign in to compare jobs
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Get a unified AI comparison and recommendation for the jobs you
                selected.
              </p>
              <AuthModalLink
                auth="login"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign in to compare
              </AuthModalLink>
            </Card>
          )}
          {user && isStreaming && !comparison?.summary && (
            <div className="h-32 animate-pulse rounded-xl border border-border bg-muted" />
          )}
          {user && streamError && (
            <div className="my-4 flex flex-col gap-3">
              <p className="text-destructive" role="alert">
                {streamError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-fit"
              >
                Retry
              </Button>
            </div>
          )}
          {comparison && (
            <Card variant="elevated" className="text-sm">
              <CardContent className={cn(CARD_PADDING_DEFAULT, "space-y-4 sm:space-y-5")}>
                <p className="text-foreground">
                  {comparison.summary}
                </p>
                {comparison.listingMatchScores &&
                  comparison.listingMatchScores.length > 0 && (
                    <div className="space-y-3">
                      <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>
                        Match to your skills
                      </h3>
                      <div className="space-y-2">
                        {comparison.listingMatchScores.map((m) => {
                          const jobLabel =
                            `Job ${(listingIds?.indexOf(m.listingId) ?? -1) + 1}`;
                          return (
                            <div
                              key={m.listingId}
                              className="rounded-lg bg-primary/10 p-3 text-foreground"
                            >
                              <p className="text-foreground">
                                <span className="font-medium">{jobLabel}: </span>
                                {typeof m.matchScore === "number" && (
                                  <span className="font-semibold">
                                    {m.matchScore}%
                                  </span>
                                )}
                              </p>
                              {m.matchedSkills &&
                                m.matchedSkills.length > 0 && (
                                  <p className="mt-1 text-xs text-foreground">
                                    <span className={EYEBROW_CLASS}>Matched: </span>
                                    {m.matchedSkills.join(", ")}
                                  </p>
                                )}
                              {m.missingSkills &&
                                m.missingSkills.length > 0 && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    <span className={EYEBROW_CLASS}>Missing: </span>
                                    {m.missingSkills.join(", ")}
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                {comparison.similarities &&
                  comparison.similarities.length > 0 && (
                    <div>
                      <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>
                        Similarities
                      </h3>
                      <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                        {comparison.similarities.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {comparison.differences &&
                  comparison.differences.length > 0 && (
                    <div>
                      <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>
                        Differences
                      </h3>
                      <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                        {comparison.differences.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {comparison.comparisonPoints &&
                  comparison.comparisonPoints.length > 0 && (
                    <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                      {comparison.comparisonPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  )}
                {comparison.recommendedListingId &&
                  comparison.recommendationReason && (
                    <div className="rounded-lg bg-primary/10 p-3 text-foreground">
                      <span className={EYEBROW_CLASS}>Better fit: </span>
                      {comparison.recommendationReason}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </section>

        <section
          aria-label="Job columns"
          className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8"
        >
          {listingIds.map((id) => (
            <CompareColumn key={id} listingId={id} />
          ))}
        </section>
      </main>
    </div>
  );
}

/** Compare page: admins are redirected to /admin; others may view (auth required for AI comparison). */
export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <UserOnlyRoute requireAuth={false}>
        <ComparePageInner />
      </UserOnlyRoute>
    </Suspense>
  );
}
