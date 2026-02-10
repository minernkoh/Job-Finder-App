/**
 * Shared skill list helpers. Single source of truth for normalizing and deduplicating skills.
 */

/** Deduplicates and trims skill strings (case-insensitive). Preserves first occurrence order. */
export function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
