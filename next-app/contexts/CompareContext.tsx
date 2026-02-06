/**
 * Compare context: holds up to 3 listing IDs for comparison. Used by listing cards, detail panel, and compare bar.
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

interface CompareContextValue {
  compareSet: string[];
  addToCompare: (listingId: string) => void;
  removeFromCompare: (listingId: string) => void;
  clearCompare: () => void;
  isInCompareSet: (listingId: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function loadFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function saveToStorage(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** Provides compare set state and helpers; persists to sessionStorage. */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareSet, setCompareSet] = useState<string[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(compareSet);
  }, [compareSet]);

  const addToCompare = useCallback((listingId: string) => {
    setCompareSet((prev) => {
      if (prev.includes(listingId)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, listingId];
    });
  }, []);

  const removeFromCompare = useCallback((listingId: string) => {
    setCompareSet((prev) => prev.filter((id) => id !== listingId));
  }, []);

  const clearCompare = useCallback(() => setCompareSet([]), []);

  const isInCompareSet = useCallback(
    (listingId: string) => compareSet.includes(listingId),
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
