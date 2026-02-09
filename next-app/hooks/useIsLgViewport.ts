/**
 * Returns true when viewport is at least Tailwind lg (1024px). Updates on resize.
 * Used to gate split-layout behavior (e.g. auto-select first job only on large screens).
 */

"use client";

import { useEffect, useState } from "react";

const LG_MEDIA = "(min-width: 1024px)";

export function useIsLgViewport(): boolean {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(LG_MEDIA);
    const update = () => setIsLg(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  return isLg;
}
