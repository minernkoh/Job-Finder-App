/**
 * Shared Framer Motion transition presets for consistent animations app-wide.
 * Use with motion.div (or other motion components) initial/animate/exit and transition props.
 */

export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const SLIDE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const SLIDE_RIGHT = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
};

export const SLIDE_LEFT_EXIT = {
  exit: { opacity: 0, x: -8 },
};

export const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export const EASE_TRANSITION = { duration: 0.2, ease: "easeOut" as const };

/** Returns transition delay for staggered list items; cap at max to avoid long waits. */
export function staggerDelay(index: number, max = 8) {
  return { delay: Math.min(index, max) * 0.05 };
}
