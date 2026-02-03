/**
 * Utility to merge Tailwind classes safely: combines clsx and twMerge so later classes override earlier ones correctly.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges class names and resolves Tailwind conflicts (e.g. "p-2" + "p-4" becomes "p-4"). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
