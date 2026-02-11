/**
 * Layout constants for consistent page width and padding across the app. Aligns with job-board best practices (single content width, predictable spacing).
 */

/** Tailwind class for max content width; use with mx-auto for centering. */
export const CONTENT_MAX_W = "max-w-6xl";

/** Tailwind class for horizontal page padding. */
export const PAGE_PX = "px-4 sm:px-6";

/** Tailwind class for main content vertical spacing (section gap). */
export const SECTION_GAP = "space-y-8";

/** Small vertical gap between stacked items. */
export const GAP_SM = "space-y-2";

/** Medium vertical gap. */
export const GAP_MD = "space-y-4";

/** Large vertical gap (e.g. header to content). */
export const GAP_LG = "space-y-6";

/** Card content: compact (lists, tables). */
export const CARD_PADDING_COMPACT = "p-4";

/** Card content: default. */
export const CARD_PADDING_DEFAULT = "p-6";

/** Card content: responsive (compact on small screens). */
export const CARD_PADDING_DEFAULT_RESPONSIVE = "p-4 sm:p-6";

/** Card content: auth flows (login, register, modal). */
export const CARD_PADDING_AUTH = "p-10";

/** Card content: hero / marketing (e.g. Why sign in). */
export const CARD_PADDING_HERO = "p-6 sm:p-8";

/** Empty state containers (centered copy). */
export const EMPTY_STATE_PADDING = "px-6 py-12";

/** Margin below compare bar (sticky bar above main content). Kept equal to space above for equidistant spacing. */
export const COMPARE_BAR_MB = "mb-4";
