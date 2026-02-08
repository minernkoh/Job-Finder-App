/**
 * Trending listings: fetches and displays top trending job listings. Shown at top of /browse page.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrending, recordListingView } from "@/lib/api/listings";
import { ListingCard } from "./listing-card";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedListings } from "@/hooks/useSavedListings";
import { trendingKeys } from "@/lib/query-keys";

/** Fetches and displays top 5 trending listings with Trending badge. */
export function TrendingListings() {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: trendingKeys.all,
    queryFn: () => fetchTrending(5, 24),
  });
  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();

  if (isLoading || listings.length === 0) return null;

  return (
    <section className="mt-10 overflow-visible">
      <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
        Trending
      </h2>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto overflow-y-visible px-2 py-3">
        {listings.map((listing) => (
          <div key={listing.id} className="min-w-[280px] max-w-[320px] flex-1 shrink-0">
            <ListingCard
              listing={listing}
              showTrendingBadge
              onView={() => recordListingView(listing.id)}
              onSave={user ? () => saveMutation.mutate(listing) : undefined}
              onUnsave={
                user ? () => unsaveMutation.mutate(listing.id) : undefined
              }
              isSaved={savedIds.has(listing.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
