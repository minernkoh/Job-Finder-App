/**
 * Sticky bar shown when 1 or more jobs are in the compare set. Offers "View comparison" (when 2+) and optional remove per job.
 */

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowsLeftRightIcon, XIcon } from "@phosphor-icons/react";
import { Button, Card } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useCompare } from "@/contexts/CompareContext";
import { BADGE_PILL_COMPARE_ITEM } from "@/lib/badges";
import { COMPARE_BAR_MB, CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { EASE_TRANSITION } from "@/lib/animations";

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
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={EASE_TRANSITION}
      className={cn("sticky top-0 z-40 mt-4 py-2", COMPARE_BAR_MB, PAGE_PX)}
    >
      <Card
        variant="default"
        className={
          fullWidth
            ? "mx-auto w-full max-w-full border-border"
            : `mx-auto w-full border-border ${CONTENT_MAX_W}`
        }
      >
        <div className="flex w-full flex-col gap-1.5 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-1.5">
          <div className="flex items-center justify-between gap-2 sm:contents">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5 sm:order-1">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <ArrowsLeftRightIcon size={18} className="text-primary" />
                <span>
                  {compareSet.length} job{compareSet.length !== 1 ? "s" : ""}{" "}
                  selected
                </span>
              </div>
              {compareSet.length >= 1 && compareSet.length <= 2 && (
                <span className="hidden md:inline text-xs text-muted-foreground">
                  Select up to three job listings to compare them.
                </span>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => canCompare && router.push(viewHref)}
              disabled={!canCompare}
              className="shrink-0 sm:order-3"
              title={
                canCompare
                  ? "Compare selected jobs"
                  : "Add at least 2 jobs to compare"
              }
            >
              Compare
            </Button>
          </div>
          <div className="flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden sm:order-2">
            {compareSet.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => removeFromCompare(item.id)}
                className={BADGE_PILL_COMPARE_ITEM}
                title={`Remove ${item.title} from comparison`}
                aria-label={`Remove job ${item.title} from comparison`}
              >
                <span className="min-w-0 max-w-[7rem] truncate sm:max-w-[9rem]">
                  {item.title}
                </span>
                <XIcon size={12} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
