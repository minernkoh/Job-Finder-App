/**
 * Trending listings: fetches and displays top trending job listings. Shown at top of /jobs page.
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
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Trending
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {listings.map((listing) => (
          <div key={listing.id} className="min-w-[280px] max-w-[320px] flex-1">
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
