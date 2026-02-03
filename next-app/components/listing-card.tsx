/**
 * Listing card: shows job title, company, location. Clickable, supports save button and view tracking.
 */

"use client";

import Link from "next/link";
import { Bookmark, BookmarkSimple } from "@phosphor-icons/react";
import { Button, Card, CardContent, CardHeader } from "@ui/components";
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
    <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
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
                  <Bookmark weight="fill" className="text-primary" />
                ) : (
                  <BookmarkSimple className="text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {listing.location && (
            <p className="truncate text-sm text-muted-foreground">
              {listing.location}
            </p>
          )}
          {listing.country && listing.country !== "sg" && (
            <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {listing.country.toUpperCase()}
            </span>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
