/**
 * Job detail panel: reusable listing detail (title, company, description, AI summary, save, prev/next). Used in split layout and full page.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  SparkleIcon,
  ArrowsLeftRightIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AuthModalLink } from "@/components/auth-modal-link";
import { sanitizeJobDescription } from "@/lib/sanitize";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import { fetchListing, recordListingView } from "@/lib/api/listings";
import { fetchProfile } from "@/lib/api/profile";
import {
  createSummaryStream,
  consumeSummaryStream,
  getSummaryForListing,
} from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import {
  isRateLimitMessage,
  isSummaryNotConfiguredMessage,
  SUMMARY_NOT_AVAILABLE_UI_MESSAGE,
} from "@/lib/api/errors";
import { toast } from "sonner";
import { useIsMdViewport } from "@/hooks/useIsMdViewport";
import { useSavedListings } from "@/hooks/useSavedListings";
import {
  listingKeys,
  profileKeys,
  summaryKeys,
  trendingKeys,
} from "@/lib/query-keys";
import { BADGE_MUTED } from "@/lib/badges";
import { CARD_PADDING_DEFAULT_RESPONSIVE, GAP_LG } from "@/lib/layout";
import { EYEBROW_CLASS, EYEBROW_MB } from "@/lib/styles";
import { InlineError, PageLoadingSkeleton } from "@/components/page-state";
import { AISummaryCard } from "@/components/ai-summary-card";

export interface JobDetailPanelProps {
  /** Listing ID to show. */
  listingId: string;
  /** Ordered list of listing IDs for prev/next navigation; when provided with basePath, shows prev/next and arrow keys. */
  listingIdsForNav?: string[];
  /** Base path for ?job= URLs (e.g. /browse or /profile). When set with listingIdsForNav, prev/next update this path. */
  basePath?: string;
  /** Optional: add current job to compare set. */
  onAddToCompare?: () => void;
  /** Optional: whether current job is in the compare set. */
  isInCompareSet?: boolean;
  /** Optional: whether compare set is full (3). */
  compareSetFull?: boolean;
  /** Optional: href for the back-to-listings link; when set, a back button is shown at top left. */
  backToHref?: string;
  /** Optional: label for the back button (default: "Back to listings"). */
  backToLabel?: string;
}

/** Reusable job detail: title, company, description, AI summary, save, prev/next, open in full page. */
export function JobDetailPanel({
  listingId,
  listingIdsForNav,
  basePath,
  onAddToCompare,
  isInCompareSet = false,
  compareSetFull = false,
  backToHref,
  backToLabel = "Back to listings",
}: JobDetailPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isMd = useIsMdViewport();

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: listingKeys(listingId),
    queryFn: () => fetchListing(listingId),
    enabled: !!listingId,
  });

  const { data: profile } = useQuery({
    queryKey: profileKeys.all,
    queryFn: fetchProfile,
    enabled: !!user,
  });

  const { data: cachedSummary } = useQuery({
    queryKey: summaryKeys(listingId),
    queryFn: () => getSummaryForListing(listingId),
    enabled: !!user && !!listingId,
  });

  const queryClient = useQueryClient();
  const { isSaved, saveMutation, unsaveMutation } = useSavedListings();
  const [summary, setSummary] = useState<Partial<SummaryWithId> | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  /* Reset summary when listing changes so the new listing's cache can be shown. */
  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
  }, [listingId]);

  /* Seed summary from cached GET result so refresh shows the cached AI summary. */
  useEffect(() => {
    if (cachedSummary != null && summary === null) setSummary(cachedSummary);
  }, [cachedSummary, summary]);

  /** Triggers streaming AI summary generation for the current listing. */
  const handleSummarize = useCallback(async () => {
    setSummaryError(null);
    setSummary(null);
    setIsSummarizing(true);
    try {
      const result = await createSummaryStream({ listingId });
      if (!result.stream) {
        setSummary(result.data);
        queryClient.setQueryData(summaryKeys(listingId), result.data);
        setIsSummarizing(false);
        return;
      }
      const final = await consumeSummaryStream(result.reader, (partial) => {
        setSummary((prev) => ({ ...prev, ...partial }));
      });
      queryClient.setQueryData(summaryKeys(listingId), final);
      setIsSummarizing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to summarize";
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : undefined;
      setSummaryError(
        status === 503 || isSummaryNotConfiguredMessage(message)
          ? SUMMARY_NOT_AVAILABLE_UI_MESSAGE
          : message,
      );
      setIsSummarizing(false);
      if (isRateLimitMessage(message)) {
        toast.error(
          "AI summary is temporarily unavailable due to rate limits. Please try again in a few minutes.",
        );
      }
    }
  }, [listingId, queryClient]);

  useEffect(() => {
    if (listingId)
      recordListingView(listingId).then(() =>
        queryClient.invalidateQueries({ queryKey: trendingKeys.all }),
      );
  }, [listingId, queryClient]);

  const description = listing?.description ?? "";
  const sanitizedDescription = useMemo(
    () => sanitizeJobDescription(description),
    [description],
  );

  const currentIndex =
    listingIdsForNav && basePath ? listingIdsForNav.indexOf(listingId) : -1;
  const hasPrev =
    currentIndex > 0 && listingIdsForNav && listingIdsForNav[currentIndex - 1];
  const hasNext =
    currentIndex >= 0 &&
    currentIndex < listingIdsForNav!.length - 1 &&
    listingIdsForNav &&
    listingIdsForNav[currentIndex + 1];
  const prevId = hasPrev ? listingIdsForNav![currentIndex - 1] : null;
  const nextId = hasNext ? listingIdsForNav![currentIndex + 1] : null;

  const navigateToJob = useCallback(
    (id: string) => {
      if (!basePath) return;
      if (basePath === "/browse") {
        const next = new URLSearchParams(searchParams?.toString() ?? "");
        next.set("job", id);
        router.replace(`/browse?${next.toString()}`);
      } else {
        router.replace(`${basePath}?job=${id}`);
      }
    },
    [basePath, router, searchParams],
  );

  useEffect(() => {
    if (!listingIdsForNav?.length || !basePath || currentIndex < 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevId) {
        e.preventDefault();
        navigateToJob(prevId);
      }
      if (e.key === "ArrowRight" && nextId) {
        e.preventDefault();
        navigateToJob(nextId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [listingIdsForNav, basePath, prevId, nextId, navigateToJob, currentIndex]);

  if (!listingId) return null;

  if (isLoading) {
    return (
      <PageLoadingSkeleton
        className={cn(GAP_LG, CARD_PADDING_DEFAULT_RESPONSIVE)}
      />
    );
  }

  if (isError || !listing) {
    return (
      <div className={CARD_PADDING_DEFAULT_RESPONSIVE}>
        <InlineError message="Listing not found." />
        <Link
          href="/browse"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Back to browse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full min-w-0 flex-col">
      <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {backToHref && !isMd && (
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={backToHref}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={backToLabel}
                >
                  <ArrowLeftIcon size={16} />
                  {backToLabel}
                </Link>
              </Button>
            )}
            {onAddToCompare && (
              <Button
                variant="outline"
                size="sm"
                disabled={isInCompareSet || compareSetFull}
                onClick={onAddToCompare}
                title={
                  compareSetFull
                    ? "You can compare up to 3 jobs. Remove one to add another."
                    : "Add to compare"
                }
              >
                <ArrowsLeftRightIcon size={16} className="mr-1" />
                {isInCompareSet ? "In comparison" : "Add to compare"}
              </Button>
            )}
          </div>
          {listingIdsForNav && basePath && (hasPrev || hasNext) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => prevId && navigateToJob(prevId)}
                aria-label="Previous job"
              >
                <ArrowLeftIcon size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => nextId && navigateToJob(nextId)}
                aria-label="Next job"
              >
                <ArrowRightIcon size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-y-auto sm:space-y-8",
          GAP_LG,
          CARD_PADDING_DEFAULT_RESPONSIVE,
        )}
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-foreground min-w-0">
              {listing.title}
            </h1>
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  isSaved(listingId)
                    ? unsaveMutation.mutate(listingId)
                    : saveMutation.mutate(listing)
                }
              >
                {isSaved(listingId) ? (
                  <>
                    <BookmarkIcon weight="fill" className="text-primary" />
                    Saved
                  </>
                ) : (
                  <>
                    <BookmarkSimpleIcon />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{listing.company}</p>
          {listing.location && (
            <p className="mt-1 text-sm text-muted-foreground">
              {listing.location}
            </p>
          )}
          {(() => {
            const salary = formatSalaryRange(
              listing.salaryMin,
              listing.salaryMax,
              listing.country,
            );
            return salary ? (
              <p className="mt-1 text-sm font-medium text-foreground">
                {salary}
              </p>
            ) : null;
          })()}
          {listing.country && listing.country !== "sg" && (
            <span className={cn("mt-2 inline-block", BADGE_MUTED)}>
              {listing.country.toUpperCase()}
            </span>
          )}
          {(() => {
            const posted = formatPostedDate(listing.postedAt);
            return posted ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Posted {posted}
              </p>
            ) : null;
          })()}
        </div>

        <div className={GAP_LG}>
          <section className="space-y-3">
            <h2 className={EYEBROW_CLASS}>AI Summary</h2>
            {summary && summary.tldr ? (
              <AISummaryCard
                summary={summary as SummaryWithId}
                hasSkills={(profile?.skills?.length ?? 0) > 0}
              />
            ) : user ? (
              <>
                <Button onClick={handleSummarize} disabled={isSummarizing}>
                  {isSummarizing ? (
                    "Summarizing…"
                  ) : (
                    <>
                      <SparkleIcon size={16} className="mr-2" />
                      Summarize with AI
                    </>
                  )}
                </Button>
                {summaryError && <InlineError message={summaryError} />}
              </>
            ) : (
              <Button asChild variant="default" size="sm">
                <AuthModalLink
                  auth="login"
                  redirect={listingId ? `/browse/${listingId}` : undefined}
                >
                  Log in to get AI summaries
                </AuthModalLink>
              </Button>
            )}
          </section>

          {(sanitizedDescription.length > 0 || listing.sourceUrl) && (
            <section className="space-y-2">
              <h2 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Description</h2>
              <Card variant="elevated" className="text-sm">
                {sanitizedDescription.length > 0 && (
                  <CardContent
                    className="p-4 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_b]:font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: sanitizedDescription,
                    }}
                  />
                )}
              </Card>
            </section>
          )}

          {(listing.sourceUrl || basePath === "/browse") && (
            <div className="-mx-4 border-t border-border pt-4 sm:-mx-6">
              <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6">
                {listing.sourceUrl && (
                  <>
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      View original posting
                    </a>
                    {basePath === "/browse" && (
                      <span
                        className="text-muted-foreground"
                        aria-hidden="true"
                      >
                        •
                      </span>
                    )}
                  </>
                )}
                {basePath === "/browse" && (
                  <Link
                    href={`/browse/${listingId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Open full page
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
