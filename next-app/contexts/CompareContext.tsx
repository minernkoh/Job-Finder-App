/**
 * Compare context: holds up to 3 listings (id + title) for comparison. Used by listing cards, detail panel, and compare bar.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const COMPARE_STORAGE_KEY = "job-finder-compare-ids";
const MAX_COMPARE = 3;

export interface CompareItem {
  id: string;
  title: string;
}

interface CompareContextValue {
  compareSet: CompareItem[];
  addToCompare: (listing: CompareItem) => void;
  removeFromCompare: (listingId: string) => void;
  clearCompare: () => void;
  isInCompareSet: (listingId: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function loadFromStorage(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: CompareItem[] = parsed
      .map((x: unknown) => {
        if (typeof x === "object" && x !== null && "id" in x) {
          const obj = x as { id: unknown; title?: unknown };
          if (typeof obj.id !== "string") return null;
          const title = typeof obj.title === "string" ? obj.title : obj.id;
          return { id: obj.id, title };
        }
        if (typeof x === "string") return { id: x, title: x };
        return null;
      })
      .filter((item): item is CompareItem => item !== null)
      .slice(0, MAX_COMPARE);
    return items;
  } catch {
    return [];
  }
}

function saveToStorage(items: CompareItem[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Provides compare set state and helpers; persists to sessionStorage. */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareSet, setCompareSet] = useState<CompareItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(compareSet);
  }, [compareSet]);

  const addToCompare = useCallback((listing: CompareItem) => {
    setCompareSet((prev) => {
      if (prev.some((x) => x.id === listing.id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, listing];
    });
  }, []);

  const removeFromCompare = useCallback((listingId: string) => {
    setCompareSet((prev) => prev.filter((item) => item.id !== listingId));
  }, []);

  const clearCompare = useCallback(() => setCompareSet([]), []);

  const isInCompareSet = useCallback(
    (listingId: string) => compareSet.some((item) => item.id === listingId),
    [compareSet]
  );

  const value: CompareContextValue = {
    compareSet,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompareSet,
  };

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}
