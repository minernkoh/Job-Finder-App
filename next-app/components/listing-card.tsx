/**
 * Listing card: shows job title, company, location, and salary when available. Clickable, supports save button and view tracking.
 */

"use client";

import Link from "next/link";
import { BookmarkIcon, BookmarkSimpleIcon } from "@phosphor-icons/react";
import { Button, Card, CardContent, CardHeader } from "@ui/components";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import type { ListingResult } from "@schemas";

interface ListingCardProps {
  listing: ListingResult;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  onView?: () => void;
  showTrendingBadge?: boolean;
}

/** Renders a job listing card with title, company, location, and optional save button. */
export function ListingCard({
  listing,
  isSaved = false,
  onSave,
  onUnsave,
  onView,
  showTrendingBadge = false,
}: ListingCardProps) {
  return (
    <Card interactive variant="default" className="cursor-pointer">
      <Link
        href={`/jobs/${listing.id}`}
        className="block"
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
            {(onSave || onUnsave) && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isSaved ? onUnsave?.() : onSave?.();
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
              listing.country
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
              <p className="text-xs text-muted-foreground">
                Posted {posted}
              </p>
            ) : null;
          })()}
        </CardContent>
      </Link>
    </Card>
  );
}
