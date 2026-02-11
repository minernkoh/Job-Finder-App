/**
 * Generic listing section: fetches listings via a provided query and renders them in a ListingCarousel.
 * Replaces the former TrendingListings and RecommendedListings components with a single parameterized component.
 */

"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import { ListingCarousel } from "./listing-carousel";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedListings } from "@/hooks/useSavedListings";
import { useCompare } from "@/contexts/CompareContext";
import type { ListingResult } from "@schemas";

interface ListingSectionProps {
  /** Section heading displayed above the carousel. */
  title: string;
  /** Accessibility label for the section (defaults to title). */
  ariaLabel?: string;
  /** React Query key for the query. */
  queryKey: QueryKey;
  /** Fetcher that returns the listings array. */
  queryFn: () => Promise<ListingResult[]>;
  /** React Query staleTime override. */
  staleTime?: number;
  /** When false, the query is disabled (e.g. recommended requires auth). */
  enabled?: boolean;
  /** When true, cards show the "Trending" badge. */
  showTrendingBadge?: boolean;
  /** Override default href per listing. */
  hrefForListing?: (listing: ListingResult) => string;
  /** When true, include compare add/remove actions on each card. */
  showCompare?: boolean;
  /** When "admin", listing cards show Edit and Delete. */
  userRole?: "admin" | "user";
  /** Called when admin deletes a listing; parent should invalidate queries. */
  onDeleteListing?: (listingId: string) => void;
}

/** Fetches listings and renders a ListingCarousel; returns null while loading or when empty. */
export function ListingSection({
  title,
  ariaLabel,
  queryKey,
  queryFn,
  staleTime,
  enabled = true,
  showTrendingBadge = false,
  hrefForListing,
  showCompare = false,
  userRole,
  onDeleteListing,
}: ListingSectionProps) {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
  });
  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();
  const { addToCompare, removeFromCompare, isInCompareSet, compareSet } =
    useCompare();

  if (isLoading || listings.length === 0) return null;

  return (
    <ListingCarousel
      title={title}
      ariaLabel={ariaLabel}
      listings={listings}
      savedIds={savedIds}
      onSave={user ? (listing) => saveMutation.mutate(listing) : undefined}
      onUnsave={user ? (id) => unsaveMutation.mutate(id) : undefined}
      showTrendingBadge={showTrendingBadge}
      hrefForListing={hrefForListing}
      onAddToCompare={
        showCompare
          ? (listing) =>
              isInCompareSet(listing.id)
                ? () => removeFromCompare(listing.id)
                : () => addToCompare({ id: listing.id, title: listing.title })
          : undefined
      }
      isInCompareSet={showCompare ? isInCompareSet : undefined}
      compareSetSize={showCompare ? compareSet.length : undefined}
      userRole={userRole}
      onDeleteListing={onDeleteListing}
    />
  );
}
