/**
 * localStorage-backed store for guest preview: profile, saves, summaries, comparisons, tailored resumes.
 */

import type {
  AISummary,
  ComparisonSummary,
  ListingResult,
  SavedListingResult,
  TailoredResumeResult,
  UserProfile,
  UserProfileUpdate,
} from "@schemas";
import { DEMO_STORAGE_PREFIX } from "./constants";

const KEYS = {
  profile: `${DEMO_STORAGE_PREFIX}profile`,
  saved: `${DEMO_STORAGE_PREFIX}saved`,
  summaries: `${DEMO_STORAGE_PREFIX}summaries`,
  comparisons: `${DEMO_STORAGE_PREFIX}comparisons`,
  tailored: `${DEMO_STORAGE_PREFIX}tailored`,
} as const;

/** Seeded Singapore full-stack profile for guest preview. */
export const SEED_PROFILE: UserProfile = {
  name: "Alex Tan",
  headline: "Full-stack Software Engineer · Singapore",
  skills: ["TypeScript", "React", "Node.js", "Next.js", "PostgreSQL", "AWS"],
  jobTitles: ["Software Engineer", "Full Stack Developer"],
  yearsOfExperience: 4,
  resumeSummary:
    "Full-stack engineer with 4 years building web products in Singapore. Strong in React, Node.js, and cloud deployment.",
  contacts: {
    email: "alex.tan@example.com",
    location: "Singapore",
    linkedin: "linkedin.com/in/alextan",
  },
  experience: [
    {
      company: "TechFlow Pte Ltd",
      title: "Software Engineer",
      period: "2022 – Present",
      bullets: [
        "Shipped customer-facing features used by 15k+ monthly active users",
        "Led migration from REST to tRPC, cutting API latency by 30%",
        "Mentored two junior engineers on code review and testing practices",
      ],
    },
    {
      company: "StartupSG Labs",
      title: "Junior Developer",
      period: "2020 – 2022",
      bullets: [
        "Built internal dashboards with React and Chart.js",
        "Integrated Adzuna and government job APIs for a hiring pilot",
      ],
    },
  ],
  education: [
    {
      school: "National University of Singapore",
      credential: "BComp (Computer Science)",
      period: "2016 – 2020",
    },
  ],
  skillGroups: [
    { name: "Frontend", skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
    { name: "Backend", skills: ["Node.js", "PostgreSQL", "MongoDB", "REST"] },
    { name: "Cloud", skills: ["AWS", "Docker", "CI/CD"] },
  ],
  projects: [
    {
      name: "Job Tracker SG",
      description: "Personal project to track applications and tailor resumes",
      bullets: ["Next.js app with MongoDB and Gemini summaries"],
    },
  ],
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** Seeds the demo store when empty (first preview visit). */
export function seedDemoStoreIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(KEYS.profile)) {
    writeJson(KEYS.profile, SEED_PROFILE);
  }
  if (!localStorage.getItem(KEYS.saved)) {
    writeJson(KEYS.saved, [] as SavedListingResult[]);
  }
  if (!localStorage.getItem(KEYS.summaries)) {
    writeJson(KEYS.summaries, {} as Record<string, AISummary & { id: string }>);
  }
  if (!localStorage.getItem(KEYS.comparisons)) {
    writeJson(KEYS.comparisons, {} as Record<string, ComparisonSummary>);
  }
  if (!localStorage.getItem(KEYS.tailored)) {
    writeJson(KEYS.tailored, {} as Record<string, TailoredResumeResult>);
  }
}

export function getDemoProfile(): UserProfile {
  seedDemoStoreIfEmpty();
  return readJson<UserProfile>(KEYS.profile, SEED_PROFILE);
}

export function updateDemoProfile(partial: UserProfileUpdate): UserProfile {
  const current = getDemoProfile();
  const next: UserProfile = {
    ...current,
    ...partial,
    yearsOfExperience:
      partial.yearsOfExperience === null
        ? undefined
        : (partial.yearsOfExperience ?? current.yearsOfExperience),
  };
  writeJson(KEYS.profile, next);
  return next;
}

export function getDemoSavedListings(): SavedListingResult[] {
  seedDemoStoreIfEmpty();
  return readJson<SavedListingResult[]>(KEYS.saved, []);
}

export function saveDemoListing(listing: ListingResult): SavedListingResult {
  const saved = getDemoSavedListings();
  const existing = saved.find((s) => s.listingId === listing.id);
  if (existing) return existing;
  const entry: SavedListingResult = {
    id: `demo-saved-${listing.id}`,
    listingId: listing.id,
    title: listing.title,
    company: listing.company,
    location: listing.location,
    sourceUrl: listing.sourceUrl,
    country: listing.country ?? "sg",
    savedAt: new Date().toISOString(),
  };
  writeJson(KEYS.saved, [...saved, entry]);
  return entry;
}

export function unsaveDemoListing(listingId: string): void {
  const saved = getDemoSavedListings().filter((s) => s.listingId !== listingId);
  writeJson(KEYS.saved, saved);
}

export function isDemoListingSaved(listingId: string): boolean {
  return getDemoSavedListings().some((s) => s.listingId === listingId);
}

export function getDemoSummary(listingId: string): (AISummary & { id: string }) | null {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, AISummary & { id: string }>>(
    KEYS.summaries,
    {},
  );
  return map[listingId] ?? null;
}

export function setDemoSummary(
  listingId: string,
  summary: AISummary & { id: string },
): void {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, AISummary & { id: string }>>(
    KEYS.summaries,
    {},
  );
  map[listingId] = summary;
  writeJson(KEYS.summaries, map);
}

export function comparisonKey(listingIds: string[]): string {
  return [...listingIds].sort().join("|");
}

export function getDemoComparison(listingIds: string[]): ComparisonSummary | null {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, ComparisonSummary>>(KEYS.comparisons, {});
  return map[comparisonKey(listingIds)] ?? null;
}

export function setDemoComparison(
  listingIds: string[],
  comparison: ComparisonSummary,
): void {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, ComparisonSummary>>(KEYS.comparisons, {});
  map[comparisonKey(listingIds)] = comparison;
  writeJson(KEYS.comparisons, map);
}

export function getDemoTailored(listingId: string): TailoredResumeResult | null {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, TailoredResumeResult>>(KEYS.tailored, {});
  return map[listingId] ?? null;
}

export function setDemoTailored(result: TailoredResumeResult): void {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, TailoredResumeResult>>(KEYS.tailored, {});
  map[result.listingId] = result;
  writeJson(KEYS.tailored, map);
}

export function getDemoTailoredById(tailorId: string): TailoredResumeResult | null {
  seedDemoStoreIfEmpty();
  const map = readJson<Record<string, TailoredResumeResult>>(KEYS.tailored, {});
  return Object.values(map).find((t) => t.id === tailorId) ?? null;
}
