/**
 * Trending listings: fetches and displays top trending job listings. Shown at top of /browse page.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrending } from "@/lib/api/listings";
import { ListingCarousel } from "./listing-carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedListings } from "@/hooks/useSavedListings";
import { trendingKeys } from "@/lib/query-keys";

interface TrendingListingsProps {
  /** When "admin", listing cards show Edit and Delete. */
  userRole?: "admin" | "user";
  /** Called when admin deletes a listing; parent should invalidate queries. */
  onDeleteListing?: (listingId: string) => void;
}

/** Fetches and displays top 5 trending listings with Trending badge. */
export function TrendingListings({
  userRole,
  onDeleteListing,
}: TrendingListingsProps = {}) {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: trendingKeys.all,
    queryFn: () => fetchTrending(5, 168), // last 7 days
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();

  if (isLoading || listings.length === 0) return null;

  return (
    <ListingCarousel
      title="Trending"
      listings={listings}
      savedIds={savedIds}
      onSave={user ? (listing) => saveMutation.mutate(listing) : undefined}
      onUnsave={user ? (id) => unsaveMutation.mutate(id) : undefined}
      showTrendingBadge
      userRole={userRole}
      onDeleteListing={onDeleteListing}
    />
  );
}
