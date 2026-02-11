/**
 * Compare page: unified AI comparison of 2–3 jobs plus per-job summary columns. Requires ids=id1,id2[,id3]. Auth required for AI.
 */

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@ui/components";
import { sanitizeJobDescription } from "@/lib/sanitize";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/app-header";
import { formatSalaryRange } from "@/lib/format";
import { fetchListing } from "@/lib/api/listings";
import { createComparisonSummary } from "@/lib/api/summaries";
import { listingKeys } from "@/lib/query-keys";
import {
  CARD_PADDING_DEFAULT,
  CARD_PADDING_DEFAULT_RESPONSIVE,
  CONTENT_MAX_W,
  GAP_MD,
  PAGE_PX,
  SECTION_GAP,
} from "@/lib/layout";
import { EYEBROW_CLASS, EYEBROW_MB } from "@/lib/styles";

/** One column: listing meta, description, and link to full page for AI summary. */
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
          <Link
            href={`/browse/${listingId}`}
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Open full page
          </Link>
        </div>
      )}
      {sanitizedDescription.length === 0 && (
        <Link
          href={`/browse/${listingId}`}
          className="text-sm text-primary hover:underline"
        >
          Open full page
        </Link>
      )}
      <div className="border-t border-border pt-4">
        <h4 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>AI Summary</h4>
        <p className="text-sm text-muted-foreground">
          Open full page for AI summary.
        </p>
      </div>
    </div>
  );
}

/** Compare page: reads ids from URL, fetches comparison + listings, renders unified summary and columns. */
function ComparePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

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

  const comparisonQuery = useQuery({
    queryKey: ["comparison", listingIds?.join(",") ?? "", user?.id ?? ""],
    queryFn: () => createComparisonSummary(listingIds!),
    enabled: !!listingIds && listingIds.length >= 2 && !!user,
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
          <h2 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Comparison summary</h2>
          {!user && (
            <Card variant="elevated" className={CARD_PADDING_DEFAULT}>
              <h3 className="mb-2 font-medium text-foreground">
                Sign in to compare jobs
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Get a unified AI comparison and recommendation for the jobs you
                selected.
              </p>
              <Link
                href="/browse?auth=login"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign in to compare
              </Link>
            </Card>
          )}
          {user && comparisonQuery.isLoading && (
            <div className="h-32 animate-pulse rounded-xl border border-border bg-muted" />
          )}
          {user && comparisonQuery.isError && (
            <p className="my-4 text-destructive" role="alert">
              {comparisonQuery.error instanceof Error
                ? comparisonQuery.error.message
                : "Failed to load comparison"}
            </p>
          )}
          {comparisonQuery.data && (
            <Card variant="elevated" className="text-sm">
              <CardContent className={cn(CARD_PADDING_DEFAULT, "space-y-4 sm:space-y-5")}>
                <p className="text-foreground">
                  {comparisonQuery.data.summary}
                </p>
                {comparisonQuery.data.similarities &&
                  comparisonQuery.data.similarities.length > 0 && (
                    <div>
                      <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>
                        Similarities
                      </h3>
                      <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                        {comparisonQuery.data.similarities.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {comparisonQuery.data.differences &&
                  comparisonQuery.data.differences.length > 0 && (
                    <div>
                      <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>
                        Differences
                      </h3>
                      <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                        {comparisonQuery.data.differences.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {comparisonQuery.data.comparisonPoints &&
                  comparisonQuery.data.comparisonPoints.length > 0 && (
                    <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                      {comparisonQuery.data.comparisonPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  )}
                {comparisonQuery.data.recommendedListingId &&
                  comparisonQuery.data.recommendationReason && (
                    <div className="rounded-lg bg-primary/10 p-3 text-foreground">
                      <span className={EYEBROW_CLASS}>Better fit: </span>
                      {comparisonQuery.data.recommendationReason}
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

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageInner />
    </Suspense>
  );
}
