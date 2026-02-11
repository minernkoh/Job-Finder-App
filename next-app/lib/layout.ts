/**
 * Layout constants for consistent page width and padding across the app. Aligns with job-board best practices (single content width, predictable spacing).
 */

/** Tailwind class for max content width; use with mx-auto for centering. */
export const CONTENT_MAX_W = "max-w-6xl";

/** Tailwind class for horizontal page padding. */
export const PAGE_PX = "px-4 sm:px-6";

/** Tailwind class for main content vertical spacing (section gap). */
export const SECTION_GAP = "space-y-8";

/** Medium vertical gap. */
export const GAP_MD = "space-y-4";

/** Large vertical gap (e.g. header to content). */
export const GAP_LG = "space-y-6";

/** Card content: compact — use for dense layouts like lists, tables, form cards, skills editors. */
export const CARD_PADDING_COMPACT = "p-4";

/** Card content: default — use for standalone content cards on desktop-only layouts. */
export const CARD_PADDING_DEFAULT = "p-6";

/** Card content: responsive — compact on mobile, default on desktop. Preferred for most content cards (AI summary, job detail, etc.). */
export const CARD_PADDING_DEFAULT_RESPONSIVE = "p-4 sm:p-6";

/** Card content: auth flows — generous padding for login, register, and modal forms. */
export const CARD_PADDING_AUTH = "p-10";

/** Card content: hero / marketing — used for promotional cards like "Why sign in". */
export const CARD_PADDING_HERO = "p-6 sm:p-8";

/** Empty state containers (centered copy). */
export const EMPTY_STATE_PADDING = "px-6 py-12";

/** Margin below compare bar (sticky bar above main content). Kept equal to space above for equidistant spacing. */
export const COMPARE_BAR_MB = "mb-4";

/** Base textarea class matching the Input component's border, focus ring, and placeholder styling. Consumers add min-h as needed. */
export const TEXTAREA_BASE_CLASS =
  "w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50";
