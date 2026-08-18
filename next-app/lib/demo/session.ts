/**
 * Guest preview session flags in localStorage (active / dismissed).
 */

import { DEMO_ACTIVE_KEY, DEMO_DISMISSED_KEY } from "./constants";
import { seedDemoStoreIfEmpty } from "./store";

export function isDemoActiveFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_ACTIVE_KEY) === "1";
}

export function setDemoActive(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    localStorage.setItem(DEMO_ACTIVE_KEY, "1");
    seedDemoStoreIfEmpty();
  } else {
    localStorage.removeItem(DEMO_ACTIVE_KEY);
  }
}

export function isDemoDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_DISMISSED_KEY) === "1";
}

export function setDemoDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  if (dismissed) {
    localStorage.setItem(DEMO_DISMISSED_KEY, "1");
  } else {
    localStorage.removeItem(DEMO_DISMISSED_KEY);
  }
}

export function clearDemoFlags(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_ACTIVE_KEY);
  localStorage.removeItem(DEMO_DISMISSED_KEY);
}
