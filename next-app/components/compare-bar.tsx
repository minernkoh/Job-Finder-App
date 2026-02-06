/**
 * Sticky bar shown when 2 or 3 jobs are in the compare set. Offers "View comparison" and optional remove per job.
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowsLeftRightIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components";
import { useCompare } from "@/contexts/CompareContext";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";

/** Bar below header when compare set has 2–3 jobs; same width as header. Links to comparison page. */
export function CompareBar() {
  const router = useRouter();
  const { compareSet, removeFromCompare } = useCompare();

  if (compareSet.length < 2) return null;

  const idsQuery = compareSet.join(",");
  const viewHref = `/browse/compare?ids=${encodeURIComponent(idsQuery)}`;

  return (
    <div
      className={`sticky top-0 z-40 border-b border-border bg-card py-2 shadow-sm ${PAGE_PX}`}
    >
      <div
        className={`mx-auto flex w-full flex-wrap items-center justify-between gap-3 ${CONTENT_MAX_W}`}
      >
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ArrowsLeftRightIcon size={18} className="text-primary" />
            <span>
              {compareSet.length} job{compareSet.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          {compareSet.length === 2 && (
            <span className="text-xs text-muted-foreground">
              Add one more job to compare all three side by side.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {compareSet.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => removeFromCompare(id)}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              title="Remove from comparison"
              aria-label={`Remove job ${id} from comparison`}
            >
              {id.slice(0, 8)}…
              <XIcon size={12} className="ml-0.5 inline" />
            </button>
          ))}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push(viewHref)}
          className="shrink-0"
        >
          Compare
        </Button>
      </div>
    </div>
  );
}
