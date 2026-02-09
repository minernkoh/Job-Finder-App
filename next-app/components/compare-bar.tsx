/**
 * Sticky bar shown when 1 or more jobs are in the compare set. Offers "View comparison" (when 2+) and optional remove per job.
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowsLeftRightIcon, XIcon } from "@phosphor-icons/react";
import { Button, Card } from "@ui/components";
import { useCompare } from "@/contexts/CompareContext";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";

interface CompareBarProps {
  /** When true, bar spans full content width (e.g. same as left + right panels). */
  fullWidth?: boolean;
}

/** Bar below header when compare set has 1–3 jobs; same width as header. Links to comparison page when 2+. */
export function CompareBar({ fullWidth }: CompareBarProps) {
  const router = useRouter();
  const { compareSet, removeFromCompare } = useCompare();

  if (compareSet.length < 1) return null;

  const idsQuery = compareSet.map((item) => item.id).join(",");
  const viewHref = `/browse/compare?ids=${encodeURIComponent(idsQuery)}`;
  const canCompare = compareSet.length >= 2;

  return (
    <div className={`sticky top-0 z-40 py-2 mb-6 ${PAGE_PX}`}>
      <Card
        variant="default"
        className={fullWidth ? "mx-auto w-full max-w-full border-border" : `mx-auto w-full border-border ${CONTENT_MAX_W}`}
      >
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ArrowsLeftRightIcon size={18} className="text-primary" />
            <span>
              {compareSet.length} job{compareSet.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          {compareSet.length === 1 && (
            <span className="text-xs text-muted-foreground">
              Add up to 2 more jobs to compare side by side.
            </span>
          )}
          {compareSet.length === 2 && (
            <span className="text-xs text-muted-foreground">
              Select up to three job listings to compare them.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {compareSet.map((item) => {
            const displayTitle = item.title.length > 24 ? item.title.slice(0, 24) + "…" : item.title;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => removeFromCompare(item.id)}
                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                title="Remove from comparison"
                aria-label={`Remove job ${item.title} from comparison`}
              >
                {displayTitle}
                <XIcon size={12} className="ml-0.5 inline" />
              </button>
            );
          })}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => canCompare && router.push(viewHref)}
          disabled={!canCompare}
          className="shrink-0"
          title={canCompare ? "Compare selected jobs" : "Add at least 2 jobs to compare"}
        >
          Compare
        </Button>
        </div>
      </Card>
    </div>
  );
}
