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
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { AuthModalLink } from "@/components/auth-modal-link";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import { fetchListing, recordListingView } from "@/lib/api/listings";
import { createSummary } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import { useSavedListings } from "@/hooks/useSavedListings";
import { listingKeys } from "@/lib/query-keys";

const eyebrowClass = "text-xs uppercase tracking-widest text-muted-foreground";

/** Renders AI summary: tldr, responsibilities, requirements, SG signals, caveats. */
function SummaryPanel({ summary }: { summary: SummaryWithId }) {
  return (
    <Card variant="elevated" className="text-sm">
      <CardContent className="p-4 space-y-4">
        <p className="text-foreground">{summary.tldr}</p>
        {summary.keyResponsibilities &&
          summary.keyResponsibilities.length > 0 && (
            <div>
              <h3 className={cn(eyebrowClass, "mb-1")}>Key responsibilities</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                {summary.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        {summary.requirements && summary.requirements.length > 0 && (
          <div>
            <h3 className={cn(eyebrowClass, "mb-1")}>Requirements</h3>
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {summary.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.salarySgd && (
          <p className="text-foreground">
            <span className={cn(eyebrowClass)}>Salary (SGD): </span>
            {summary.salarySgd}
          </p>
        )}
        {summary.jdMatch && (
          <div className="space-y-1">
            <p className="text-foreground">
              <span className={eyebrowClass}>Match to your skills: </span>
              {typeof summary.jdMatch.matchScore === "number" && (
                <span className="font-medium">{summary.jdMatch.matchScore}%</span>
              )}
            </p>
            {summary.jdMatch.matchedSkills &&
              summary.jdMatch.matchedSkills.length > 0 && (
                <p className="text-foreground text-xs">
                  <span className={eyebrowClass}>Matched: </span>
                  {summary.jdMatch.matchedSkills.join(", ")}
                </p>
              )}
            {summary.jdMatch.missingSkills &&
              summary.jdMatch.missingSkills.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  <span className={eyebrowClass}>Missing: </span>
                  {summary.jdMatch.missingSkills.join(", ")}
                </p>
              )}
          </div>
        )}
        {summary.caveats && summary.caveats.length > 0 && (
          <p className="text-muted-foreground text-xs">
            <span className={eyebrowClass}>Caveats: </span>
            {summary.caveats.join("; ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface JobDetailPanelProps {
  /** Listing ID to show. */
  listingId: string;
  /** Ordered list of listing IDs for prev/next navigation; when provided with basePath, shows prev/next and arrow keys. */
  listingIdsForNav?: string[];
  /** Base path for ?job= URLs (e.g. /browse or /profile). When set with listingIdsForNav, prev/next update this path. */
  basePath?: string;
  /** Whether to show a compact toolbar (e.g. in split panel) vs full header. */
  compact?: boolean;
  /** Optional: add current job to compare set. */
  onAddToCompare?: () => void;
  /** Optional: whether current job is in the compare set. */
  isInCompareSet?: boolean;
  /** Optional: whether compare set is full (3). */
  compareSetFull?: boolean;
}

/** Reusable job detail: title, company, description, AI summary, save, prev/next, open in full page. */
export function JobDetailPanel({
  listingId,
  listingIdsForNav,
  basePath,
  compact = false,
  onAddToCompare,
  isInCompareSet = false,
  compareSetFull = false,
}: JobDetailPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: listingKeys(listingId),
    queryFn: () => fetchListing(listingId),
    enabled: !!listingId,
  });

  const { isSaved, saveMutation, unsaveMutation } = useSavedListings();
  const [summary, setSummary] = useState<SummaryWithId | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const summarizeMutation = useMutation({
    mutationFn: () => createSummary({ listingId }),
    onSuccess: (data) => {
      setSummary(data);
      setSummaryError(null);
    },
    onError: (err) => {
      setSummaryError(
        err instanceof Error ? err.message : "Failed to summarize"
      );
    },
  });

  useEffect(() => {
    if (listingId) recordListingView(listingId);
  }, [listingId]);

  const sanitizedDescription = useMemo(() => {
    if (!listing?.description) return "";
    const sanitized = DOMPurify.sanitize(listing.description, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "strong",
        "b",
        "em",
        "i",
        "a",
        "h1",
        "h2",
        "h3",
      ],
      ADD_ATTR: ["href", "target", "rel"],
    });
    return sanitized.trim();
  }, [listing?.description]);

  const currentIndex =
    listingIdsForNav && basePath
      ? listingIdsForNav.indexOf(listingId)
      : -1;
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
    [basePath, router, searchParams]
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
      <div className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">Listing not found.</p>
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
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Group: Back, Save, Add to compare */}
          {basePath && (
            <Link
              href={basePath === "/browse" ? "/browse" : basePath}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon size={16} />
              Back
            </Link>
          )}
          {user && (
            <Button
              variant="outline"
              size="sm"
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
          {/* Group: Open links */}
          <span className="inline-flex items-center gap-2 border-l border-border pl-3">
            <Link
              href={`/browse/${listingId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Open in new tab
            </Link>
            <Link
              href={`/browse/${listingId}`}
              className="text-sm text-primary hover:underline"
            >
              Open full page
            </Link>
          </span>
        </div>
        {listingIdsForNav && basePath && (hasPrev || hasNext) && (
          <div className="flex items-center gap-3">
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
            <span className="text-xs text-muted-foreground">
              Use arrow keys to switch jobs
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 p-4 sm:p-6 sm:space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {listing.title}
          </h1>
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
              listing.country
            );
            return salary ? (
              <p className="mt-1 text-sm font-medium text-foreground">
                {salary}
              </p>
            ) : null;
          })()}
          {listing.country && listing.country !== "sg" && (
            <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {(sanitizedDescription.length > 0 || listing.sourceUrl) && (
            <section className="space-y-2">
              <h2 className={cn(eyebrowClass, "mb-2")}>Description</h2>
              <Card variant="elevated" className="text-sm">
                {sanitizedDescription.length > 0 && (
                  <CardContent
                    className="p-4 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_b]:font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: sanitizedDescription,
                    }}
                  />
                )}
                {listing.sourceUrl && (
                  <div
                    className={cn(
                      "px-4 pb-4",
                      sanitizedDescription.length > 0 &&
                        "border-t border-border pt-4"
                    )}
                  >
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary hover:underline"
                    >
                      View original posting
                    </a>
                  </div>
                )}
              </Card>
            </section>
          )}

          <section className="space-y-3">
            <h2 className={eyebrowClass}>AI Summary</h2>
            {summary ? (
              <SummaryPanel summary={summary} />
            ) : user ? (
              <>
                <Button
                  onClick={() => summarizeMutation.mutate()}
                  disabled={summarizeMutation.isPending}
                >
                  {summarizeMutation.isPending ? (
                    "Summarizing…"
                  ) : (
                    <>
                      <SparkleIcon size={16} className="mr-2" />
                      Summarize with AI
                    </>
                  )}
                </Button>
                {summaryError && (
                  <p className="text-sm text-destructive">{summaryError}</p>
                )}
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
        </div>
      </div>
    </div>
  );
}
