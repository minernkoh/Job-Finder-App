/**
 * Single source of truth for badge/chip Tailwind classes. Use these instead of ad-hoc class strings so styling stays consistent.
 */

/** Primary accent badge (e.g. "Trending"). */
export const BADGE_PRIMARY =
  "rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary";

/** Muted label badge (e.g. posted date, meta). */
export const BADGE_MUTED =
  "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground";

/** Muted badge with tighter horizontal padding (e.g. country code). */
export const BADGE_MUTED_TIGHT = "rounded bg-muted px-1.5 py-0.5 text-xs";

/** Pill-style role badge for header (e.g. "Admin"). */
export const BADGE_PILL_ROLE =
  "rounded-full px-2 py-0.5 text-xs font-medium bg-primary/15 text-primary border border-primary/30";

/** Compare bar job pill (removable item); includes responsive sizing. */
export const BADGE_PILL_COMPARE_ITEM =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-0.5 rounded bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground min-[480px]:min-h-0 min-[480px]:px-2 min-[480px]:py-0.5";
