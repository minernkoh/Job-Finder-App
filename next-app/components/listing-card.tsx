/**
 * Listing card: shows job title, company, location, and salary when available. Clickable, supports save, view tracking, and optional compare.
 */

"use client";

import Link from "next/link";
import {
  BookmarkIcon,
  BookmarkSimpleIcon,
  ArrowsLeftRightIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button, Card, CardContent, CardHeader } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import type { ListingResult } from "@schemas";

interface ListingCardProps {
  listing: ListingResult;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  onView?: () => void;
  showTrendingBadge?: boolean;
  /** Override link href (e.g. /browse?job=id for split layout). */
  href?: string;
  /** Add this listing to the compare set (max 3). */
  onAddToCompare?: () => void;
  /** Whether this listing is already in the compare set. */
  isInCompareSet?: boolean;
  /** Current compare set size; when 3, adding is disabled unless isInCompareSet. */
  compareSetSize?: number;
  /** Whether this listing is the one currently shown in the detail panel (for split layout). */
  isSelected?: boolean;
  /** When "admin", show Edit and Delete controls. */
  userRole?: "admin" | "user";
  /** Called when admin confirms delete; parent should call API and invalidate queries. */
  onDeleteListing?: (listingId: string) => void;
}

/** Renders a job listing card with title, company, location, and optional save and compare. */
export function ListingCard({
  listing,
  isSaved = false,
  onSave,
  onUnsave,
  onView,
  showTrendingBadge = false,
  href,
  onAddToCompare,
  isInCompareSet = false,
  compareSetSize = 0,
  isSelected = false,
  userRole,
  onDeleteListing,
}: ListingCardProps) {
  const cardHref = href ?? `/browse?job=${listing.id}`;
  const compareSetFull = compareSetSize >= 3;
  const canAddToCompare = onAddToCompare && (isInCompareSet || !compareSetFull);
  const isAdmin = userRole === "admin";

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      typeof window !== "undefined" &&
      window.confirm("Delete this listing? This cannot be undone.")
    ) {
      onDeleteListing?.(listing.id);
    }
  };

  return (
    <Card
      interactive
      variant="default"
      className={cn(
        "cursor-pointer h-full flex flex-col",
        isSelected && "border-2 border-primary",
        isSelected &&
          "hover:ring-0 hover:ring-offset-0 focus-within:ring-0 focus-within:ring-offset-0",
      )}
    >
      <Link
        href={cardHref}
        className="block h-full flex flex-col min-h-0 flex-1"
        prefetch={false}
        onClick={() => onView?.()}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">
              {listing.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {listing.company}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showTrendingBadge && (
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Trending
              </span>
            )}
            {onAddToCompare && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (canAddToCompare) onAddToCompare();
                }}
                disabled={!isInCompareSet && compareSetFull}
                title={
                  compareSetFull && !isInCompareSet
                    ? "You can compare up to 3 jobs. Remove one to add another."
                    : isInCompareSet
                      ? "Remove"
                      : "Add to compare"
                }
                aria-label={
                  isInCompareSet ? "Remove from comparison" : "Add to compare"
                }
              >
                <ArrowsLeftRightIcon
                  size={16}
                  className={
                    isInCompareSet ? "text-primary" : "text-muted-foreground"
                  }
                />
              </Button>
            )}
            {(onSave || onUnsave) && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isSaved) {
                    onUnsave?.();
                  } else {
                    onSave?.();
                  }
                }}
                aria-label={isSaved ? "Unsave" : "Save"}
              >
                {isSaved ? (
                  <BookmarkIcon weight="fill" className="text-primary" />
                ) : (
                  <BookmarkSimpleIcon className="text-muted-foreground" />
                )}
              </Button>
            )}
            {isAdmin && (
              <>
                <Link
                  href={`/admin/listings?edit=${listing.id}`}
                  className="shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-muted p-1.5"
                  onClick={(e) => e.stopPropagation()}
                  title="Edit listing"
                  aria-label="Edit listing"
                >
                  <PencilSimpleIcon
                    size={16}
                    className="text-muted-foreground"
                  />
                </Link>
                {onDeleteListing && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    onClick={handleDelete}
                    title="Delete listing"
                    aria-label="Delete listing"
                  >
                    <TrashIcon size={16} className="text-muted-foreground" />
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {listing.location && (
            <p className="truncate text-sm text-muted-foreground">
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
            <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {listing.country.toUpperCase()}
            </span>
          )}
          {(() => {
            const posted = formatPostedDate(listing.postedAt);
            return posted ? (
              <p className="text-xs text-muted-foreground">Posted {posted}</p>
            ) : null;
          })()}
        </CardContent>
      </Link>
    </Card>
  );
}
