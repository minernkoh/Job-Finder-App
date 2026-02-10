/**
 * Recommended listings: fetches and displays job listings recommended for the current user (based on role/skills). Shown on browse when signed in and before search.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecommendedListings } from "@/lib/api/listings";
import { ListingCarousel } from "./listing-carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedListings } from "@/hooks/useSavedListings";
import { useCompare } from "@/contexts/CompareContext";
import { recommendedKeys } from "@/lib/query-keys";

interface RecommendedListingsProps {
  /** When "admin", listing cards show Edit and Delete. */
  userRole?: "admin" | "user";
  /** Called when admin deletes a listing; parent should invalidate queries. */
  onDeleteListing?: (listingId: string) => void;
}

/** Fetches and displays recommended listings for the signed-in user (based on profile). Links to full job page. */
export function RecommendedListings({
  userRole,
  onDeleteListing,
}: RecommendedListingsProps = {}) {
  const { user } = useAuth();
  const { addToCompare, removeFromCompare, isInCompareSet, compareSet } =
    useCompare();
  const { data, isLoading } = useQuery({
    queryKey: recommendedKeys.all,
    queryFn: () => fetchRecommendedListings(),
    enabled: !!user,
  });
  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();
  const listings = data?.listings ?? [];

  if (!user || isLoading || listings.length === 0) return null;

  return (
    <ListingCarousel
      title="Recommended For You"
      ariaLabel="Recommended for you"
      listings={listings}
      savedIds={savedIds}
      onSave={(listing) => saveMutation.mutate(listing)}
      onUnsave={(id) => unsaveMutation.mutate(id)}
      hrefForListing={(listing) => `/browse/${listing.id}`}
      onAddToCompare={(listing) =>
        isInCompareSet(listing.id)
          ? () => removeFromCompare(listing.id)
          : () => addToCompare({ id: listing.id, title: listing.title })
      }
      isInCompareSet={isInCompareSet}
      compareSetSize={compareSet.length}
      userRole={userRole}
      onDeleteListing={onDeleteListing}
    />
  );
}
