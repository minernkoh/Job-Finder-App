/**
 * Job detail panel: reusable listing detail (title, company, description, AI summary, save, prev/next). Used in split layout and full page.
 */

"use client";

import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  SparkleIcon,
  ArrowsLeftRightIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_TRANSITION } from "@/lib/animations";
import { AISummaryCard } from "@/components/ai-summary-card";
import { AuthModalLink } from "@/components/auth-modal-link";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/api/errors";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import { fetchListing, recordListingView } from "@/lib/api/listings";
import { createSummary } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import { useSavedListings } from "@/hooks/useSavedListings";
import { listingKeys } from "@/lib/query-keys";

/** Compare button that shows "Remove" on hover when job is in comparison (tooltip and label). */
function CompareButtonWithHover({
  isInCompareSet,
  compareSetFull,
  onAddToCompare,
}: {
  isInCompareSet: boolean;
  compareSetFull: boolean;
  onAddToCompare: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showRemove = isInCompareSet && hovered;
  const label = showRemove
    ? "Remove"
    : isInCompareSet
      ? "In comparison"
      : "Add to compare";
  const title =
    compareSetFull && !isInCompareSet
      ? "You can compare up to 3 jobs. Remove one to add another."
      : isInCompareSet
        ? "Remove"
        : "Add to compare";
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!isInCompareSet && compareSetFull}
      onClick={onAddToCompare}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={isInCompareSet ? "Remove from comparison" : "Add to compare"}
      className={showRemove ? "!text-destructive hover:!text-destructive [&_svg]:!text-destructive" : undefined}
    >
      <ArrowsLeftRightIcon size={16} className="mr-1" />
      {label}
    </Button>
  );
}

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
  /** Optional: when provided, called when admin confirms delete; parent should call API and invalidate. */
  onDeleteListing?: (listingId: string) => void;
  /** Optional: when set, shows "Back to Listings" link (visible below lg) to return to the list view. */
  backToListingsHref?: string | null;
}

/** Reusable job detail: title, company, description, AI summary, save, prev/next, open in full page. */
export function JobDetailPanel({
  listingId,
  listingIdsForNav,
  basePath,
  onAddToCompare,
  isInCompareSet = false,
  compareSetFull = false,
  onDeleteListing,
  backToListingsHref,
}: JobDetailPanelProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const isBrowseList = pathname === "/browse";
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
      toast.success("AI summary ready");
    },
    onError: (err) => {
      const message = getErrorMessage(err, "Failed to summarize");
      setSummaryError(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    if (listingId) recordListingView(listingId);
  }, [listingId]);

  const hasAutoSummarized = useRef(false);
  useEffect(() => {
    if (
      hasAutoSummarized.current ||
      !user ||
      !searchParams ||
      searchParams.get("summarize") !== "1" ||
      searchParams.get("job") !== listingId
    ) {
      return;
    }
    hasAutoSummarized.current = true;
    summarizeMutation.mutate(undefined, {
      onSettled: () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("summarize");
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname);
      },
    });
  }, [user, searchParams, listingId, pathname, router]);

  const description = listing?.description ?? "";
  const sanitizedDescription = useMemo(() => {
    if (!description) return "";
    const sanitized = DOMPurify.sanitize(description, {
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
  }, [description]);

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
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {backToListingsHref && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="lg:hidden -ml-2"
              aria-label="Back to listings"
            >
              <Link
                href={backToListingsHref}
                className="inline-flex items-center gap-1.5"
              >
                <ArrowLeftIcon size={18} aria-hidden />
                Back to Listings
              </Link>
            </Button>
          )}
          {/* Group: Save, Add to compare */}
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
            <CompareButtonWithHover
              isInCompareSet={isInCompareSet}
              compareSetFull={compareSetFull}
              onAddToCompare={onAddToCompare}
            />
          )}
          {user?.role === "admin" && (
            <span className="inline-flex items-center gap-2 border-l border-border pl-3">
              <Link
                href={`/admin/listings?edit=${listingId}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <PencilSimpleIcon size={14} />
                Edit
              </Link>
              {onDeleteListing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm(
                        "Delete this listing? This cannot be undone.",
                      )
                    ) {
                      onDeleteListing(listingId);
                    }
                  }}
                  title="Delete listing"
                >
                  <TrashIcon size={14} />
                  Delete
                </Button>
              )}
            </span>
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

      <AnimatePresence mode="wait">
        <motion.div
          key={listingId}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={EASE_TRANSITION}
          className="flex-1 overflow-y-auto space-y-6 p-4 sm:p-6 sm:space-y-8"
        >
          <div className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              {listing.title}
            </h1>
            <p className="text-muted-foreground">{listing.company}</p>
            {listing.location && (
              <p className="text-sm text-muted-foreground">
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
                <p className="text-sm font-medium text-foreground">{salary}</p>
              ) : null;
            })()}
            {listing.country && listing.country !== "sg" && (
              <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {listing.country.toUpperCase()}
              </span>
            )}
          </div>
          {(() => {
            const posted = formatPostedDate(listing.postedAt);
            return posted ? (
              <p className="shrink-0 text-sm text-muted-foreground">
                Posted {posted}
              </p>
            ) : null;
          })()}
        </div>

        <div className="flex flex-col gap-6">
          <section className="space-y-3">
            <h2 className={"eyebrow"}>AI Summary</h2>
            {summary ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={EASE_TRANSITION}
              >
                <AISummaryCard
                  summary={summary}
                  maxResponsibilities={5}
                  maxRequirements={5}
                />
              </motion.div>
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
                  redirect={
                    listingId
                      ? `/browse?job=${listingId}&summarize=1`
                      : undefined
                  }
                >
                  Log in to get AI summaries
                </AuthModalLink>
              </Button>
            )}
          </section>

          {(sanitizedDescription.length > 0 ||
            listing.sourceUrl ||
            (isBrowseList && !!listingId)) && (
            <section className="space-y-2">
              <h2 className={cn("eyebrow", "mb-2")}>Description</h2>
              <Card variant="elevated" className="text-sm">
                {sanitizedDescription.length > 0 && (
                  <CardContent
                    className="p-4 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_b]:font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: sanitizedDescription,
                    }}
                  />
                )}
                {(listing.sourceUrl || isBrowseList) && (
                  <div
                    className={cn(
                      "px-4 pb-4",
                      sanitizedDescription.length > 0 &&
                        "border-t border-border pt-4",
                    )}
                  >
                    {listing.sourceUrl && (
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-primary hover:underline"
                      >
                        View original posting
                      </a>
                    )}
                    {listing.sourceUrl && isBrowseList && (
                      <span className="mx-2 text-muted-foreground">·</span>
                    )}
                    {isBrowseList && listingId && (
                      <Link
                        href={`/browse/${listingId}`}
                        className="inline-block text-sm text-primary hover:underline"
                      >
                        Open full page
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            </section>
          )}
        </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
