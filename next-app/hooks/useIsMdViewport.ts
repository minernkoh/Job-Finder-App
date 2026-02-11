/**
 * Returns true when viewport is at least Tailwind md (768px). Updates on resize.
 * Used to gate split-layout behavior so tablet and desktop show list + detail side by side.
 */

"use client";

import { useEffect, useState } from "react";

const MD_MEDIA = "(min-width: 768px)";

export function useIsMdViewport(): boolean {
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(MD_MEDIA);
    const update = () => setIsMd(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  return isMd;
}
