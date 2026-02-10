/**
 * Shared horizontal carousel of listing cards. Used by TrendingListings and RecommendedListings.
 */

"use client";

import { motion } from "framer-motion";
import { recordListingView } from "@/lib/api/listings";
import { EASE_TRANSITION, staggerDelay } from "@/lib/animations";
import { ListingCard } from "./listing-card";
import type { ListingResult } from "@schemas";

export interface ListingCarouselProps {
  /** Section heading (e.g. "Trending", "Recommended For You"). */
  title: string;
  /** Accessibility label for the section. */
  ariaLabel?: string;
  listings: ListingResult[];
  savedIds: Set<string>;
  onSave?: (listing: ListingResult) => void;
  onUnsave?: (listingId: string) => void;
  showTrendingBadge?: boolean;
  /** When "admin", cards show Edit and Delete. */
  userRole?: "admin" | "user";
  onDeleteListing?: (listingId: string) => void;
  /** Override default href per listing (e.g. /browse/[id] for recommended). */
  hrefForListing?: (listing: ListingResult) => string;
  /** Compare: add/remove from compare set. */
  onAddToCompare?: (listing: ListingResult) => () => void;
  isInCompareSet?: (listingId: string) => boolean;
  compareSetSize?: number;
}

/** Renders a horizontal scrollable list of listing cards with a section title. */
export function ListingCarousel({
  title,
  ariaLabel,
  listings,
  savedIds,
  onSave,
  onUnsave,
  showTrendingBadge = false,
  userRole,
  onDeleteListing,
  hrefForListing,
  onAddToCompare,
  isInCompareSet = () => false,
  compareSetSize = 0,
}: ListingCarouselProps) {
  return (
    <section
      className="mt-10 min-w-0 w-full overflow-visible"
      aria-label={ariaLabel ?? undefined}
    >
      <h2 className="eyebrow mb-3">{title}</h2>
      <div className="scrollbar-hide flex min-w-0 w-full min-h-[12rem] gap-3 overflow-x-auto overflow-y-visible px-4 pt-3 pb-4">
        {listings.map((listing, index) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              ...EASE_TRANSITION,
              ...staggerDelay(index),
            }}
            className="min-w-[280px] max-w-[320px] flex-1 shrink-0"
          >
            <ListingCard
              listing={listing}
              href={hrefForListing?.(listing)}
              showTrendingBadge={showTrendingBadge}
              onView={() => recordListingView(listing.id)}
              onSave={onSave ? () => onSave(listing) : undefined}
              onUnsave={onUnsave ? () => onUnsave(listing.id) : undefined}
              isSaved={savedIds.has(listing.id)}
              onAddToCompare={onAddToCompare?.(listing)}
              isInCompareSet={isInCompareSet(listing.id)}
              compareSetSize={compareSetSize}
              userRole={userRole}
              onDeleteListing={onDeleteListing}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
