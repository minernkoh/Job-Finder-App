/**
 * My Jobs page: trending listings and saved listings for the current user. Split layout with job detail panel. Protected.
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { savedListingToListingResult } from "@/lib/api/saved";
import { ListingCard } from "@/components/listing-card";
import { useSavedListings } from "@/hooks/useSavedListings";
import { TrendingListings } from "@/components/trending-listings";
import { CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";

/** Inner content: header, compare bar, trending, saved list; split layout with detail panel when a job is selected. */
function MyJobsContent() {
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { savedListings, isLoadingSaved, unsaveMutation } = useSavedListings();
  const {
    compareSet,
    addToCompare,
    isInCompareSet,
  } = useCompare();
  const selectedJobId = searchParams?.get("job") ?? null;

  const savedListingIds = savedListings.map((s) => s.listingId);
  const showSplitLayout = !isLoadingSaved && savedListings.length > 0;

  return (
    <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
      <AppHeader title="My Jobs" user={user} onLogout={logout} />
      <CompareBar />

      <main
        className={cn(
          "mx-auto flex-1 w-full py-8",
          showSplitLayout
            ? "flex flex-col lg:flex-row gap-0 min-h-0 w-full max-w-full"
            : cn(CONTENT_MAX_W, SECTION_GAP)
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1",
            showSplitLayout &&
              "lg:max-w-[40%] lg:flex lg:flex-col lg:overflow-hidden pr-4 lg:pr-6",
            showSplitLayout && selectedJobId && "hidden lg:flex"
          )}
        >
          <TrendingListings />

          <section aria-label="Saved listings" className="space-y-4">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Saved listings
            </h2>
            {isLoadingSaved && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            )}

            {!isLoadingSaved && savedListings.length === 0 && (
              <p className="text-muted-foreground">
                You haven&apos;t saved any listings yet.{" "}
                <Link href="/jobs" className="text-primary hover:underline">
                  Browse jobs
                </Link>{" "}
                to save your favorites.
              </p>
            )}

            {!isLoadingSaved && savedListings.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Select up to 3 jobs to compare them side by side.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {savedListings.map((s) => {
                    const listing = savedListingToListingResult(s);
                    return (
                      <ListingCard
                        key={s.id}
                        listing={listing}
                        href={`/my-jobs?job=${listing.id}`}
                        isSaved
                        onUnsave={() => unsaveMutation.mutate(s.listingId)}
                        onView={() => {}}
                        onAddToCompare={() => addToCompare(listing.id)}
                        isInCompareSet={isInCompareSet(listing.id)}
                        compareSetSize={compareSet.length}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {showSplitLayout && selectedJobId && (
          <aside className="flex flex-1 flex-col min-w-0 border-l border-border bg-card pl-4 lg:pl-6">
            <JobDetailPanel
              listingId={selectedJobId}
              listingIdsForNav={savedListingIds}
              basePath="/my-jobs"
              onAddToCompare={() => addToCompare(selectedJobId)}
              isInCompareSet={isInCompareSet(selectedJobId)}
              compareSetFull={compareSet.length >= 3}
            />
          </aside>
        )}
        {showSplitLayout && !selectedJobId && (
          <aside className="hidden lg:flex flex-1 flex-col min-w-0 border-l border-border bg-card pl-4 lg:pl-6">
            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
              Select a job
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

/** My Jobs page: protected; shows trending and saved listings with split-panel detail. */
export default function MyJobsPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <MyJobsContent />
      </ProtectedRoute>
    </Suspense>
  );
}
