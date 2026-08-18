/**
 * Template AI results for guest preview — no Gemini calls.
 */

import type {
  AISummary,
  ComparisonSummary,
  ListingResult,
  ResumeParseResult,
  TailoredResumeResult,
  UserProfile,
} from "@schemas";
import type { SummaryWithId } from "@/lib/api/summaries";
import { getDemoProfile } from "./store";

const PREVIEW_CAVEAT =
  "Example result for preview mode. Sign up for real AI summaries tailored to your profile.";

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function skillOverlap(
  profile: UserProfile,
  text: string,
): { matched: string[]; missing: string[]; score: number } {
  const skills = profile.skills ?? [];
  const haystack = text.toLowerCase();
  const matched = skills.filter((s) => haystack.includes(normalizeSkill(s)));
  const missing = skills.filter((s) => !haystack.includes(normalizeSkill(s))).slice(0, 4);
  const score =
    skills.length === 0
      ? 65
      : Math.min(95, Math.round(50 + (matched.length / skills.length) * 45));
  return { matched, missing, score };
}

function listingText(listing: Pick<ListingResult, "title" | "company" | "description">): string {
  return [listing.title, listing.company, listing.description ?? ""].join(" ");
}

export function buildCannedSummary(
  listing: ListingResult,
  profile: UserProfile = getDemoProfile(),
): SummaryWithId {
  const { matched, missing, score } = skillOverlap(profile, listingText(listing));
  const title = listing.title;
  const company = listing.company;

  return {
    id: `demo-summary-${listing.id}`,
    tldr: `${title} at ${company}: a ${profile.jobTitles?.[0] ?? "software"} role aligned with your preview profile. Strong fit on ${matched.slice(0, 3).join(", ") || "core stack"}.`,
    keyResponsibilities: [
      `Build and ship features for ${company}'s product team`,
      "Collaborate with designers and PMs on roadmap delivery",
      "Write maintainable TypeScript and review peer pull requests",
      "Improve reliability, observability, and deployment pipelines",
    ],
    requirements: [
      "3+ years of professional software development",
      "Experience with React or similar modern frontend frameworks",
      "Comfort working across the stack (API + UI)",
      "Clear written communication in a remote-friendly team",
    ],
    niceToHaves: missing.slice(0, 2).length
      ? missing.slice(0, 2).map((s) => `Exposure to ${s}`)
      : ["Open-source contributions", "Experience in regulated industries"],
    salarySgd: "Competitive; check listing for employer-stated range",
    jdMatch: {
      matchScore: score,
      matchedSkills: matched.slice(0, 6),
      missingSkills: missing.slice(0, 4),
    },
    caveats: [PREVIEW_CAVEAT],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function buildCannedComparison(
  listings: ListingResult[],
  profile: UserProfile = getDemoProfile(),
): ComparisonSummary {
  const scores = listings.map((l) => ({
    listingId: l.id,
    ...skillOverlap(profile, listingText(l)),
  }));
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const titles = listings.map((l) => `${l.title} (${l.company})`);

  return {
    summary: `Compared ${listings.length} roles against your preview profile. ${titles.join(" vs ")} — highest overlap with ${listings.find((l) => l.id === best?.listingId)?.title ?? "the first listing"}.`,
    similarities: [
      "All roles target product engineering teams in Singapore",
      "TypeScript/React experience is valued across listings",
      "Collaboration with cross-functional partners is expected",
    ],
    differences: listings.map(
      (l, i) =>
        `${l.company}: ${i === 0 ? "broader full-stack scope" : i === 1 ? "more frontend-focused" : "senior IC expectations"}`,
    ),
    comparisonPoints: [
      "Seniority and team size vary by employer",
      "Remote/hybrid policies differ — confirm on employer site",
      "Compensation bands may not be published in the listing",
    ],
    recommendedListingId: best?.listingId,
    recommendationReason: `Best skill overlap (${best?.score ?? 70}%) with your preview profile based on keyword matching.`,
    listingMatchScores: scores.map((s) => ({
      listingId: s.listingId,
      matchScore: s.score,
      matchedSkills: s.matched.slice(0, 5),
      missingSkills: s.missing.slice(0, 3),
    })),
  };
}

export function buildCannedParseResult(
  profile: UserProfile = getDemoProfile(),
): ResumeParseResult {
  return {
    ...profile,
    skills: profile.skills,
    jobTitles: profile.jobTitles,
    resumeSummary: profile.resumeSummary,
    yearsOfExperience: profile.yearsOfExperience,
    resumeAssessment:
      "Preview mode: uploaded files are not sent to AI. This sample profile shows what parsing would populate.",
    suggestedSkills: ["GraphQL", "Kubernetes", "System Design"],
  };
}

export function buildCannedSkillSuggest(
  currentRole: string,
  profile: UserProfile = getDemoProfile(),
): { skills: string[] } {
  const base = new Set(profile.skills.map(normalizeSkill));
  const extras = [
    "System Design",
    "CI/CD",
    "GraphQL",
    "Docker",
    "Agile",
    "Technical Writing",
  ].filter((s) => !base.has(normalizeSkill(s)));
  void currentRole;
  return { skills: extras.slice(0, 5) };
}

export function buildCannedTailor(
  listing: ListingResult,
  profile: UserProfile = getDemoProfile(),
  forceNewId = false,
): TailoredResumeResult {
  const { matched, missing, score } = skillOverlap(profile, listingText(listing));
  const keywords = listing.title.split(/\W+/).filter((w) => w.length > 3).slice(0, 3);

  const experience =
    profile.experience?.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map(
        (b) =>
          `${b} — emphasised for ${listing.company}'s ${keywords[0] ?? "product"} needs`,
      ),
    })) ?? [];

  const content = {
    name: profile.name ?? "Alex Tan",
    headline:
      profile.headline ??
      `${profile.jobTitles?.[0] ?? "Software Engineer"} · Tailored for ${listing.title}`,
    contacts: profile.contacts,
    summary: `Results-driven engineer applying to ${listing.title} at ${listing.company}. Preview-mode example highlighting ${matched.slice(0, 3).join(", ") || "relevant experience"}.`,
    experience,
    skillGroups:
      profile.skillGroups ??
      [{ name: "Core", skills: profile.skills.slice(0, 8) }],
    projects: profile.projects,
    education: profile.education,
    honours: profile.honours,
    matchScore: score,
    gaps: missing.length
      ? missing.map((s) => `Consider strengthening ${s} for this JD`)
      : ["No major gaps detected in preview sample"],
    coverLetter: `Dear ${listing.company} hiring team,\n\nI am excited to apply for the ${listing.title} role. In preview mode this letter is a template showing how tailoring would read for your profile and this job.\n\nMy background in ${matched.slice(0, 2).join(" and ") || "full-stack development"} aligns with the responsibilities described. I would welcome the opportunity to discuss how I can contribute to your team.\n\nSincerely,\n${profile.name ?? "Alex Tan"}`,
    warnings: [PREVIEW_CAVEAT],
  };

  const existingId = forceNewId ? undefined : `demo-tailor-${listing.id}`;

  return {
    id: existingId ?? `demo-tailor-${listing.id}-${Date.now()}`,
    listingId: listing.id,
    listingTitle: listing.title,
    listingCompany: listing.company,
    content,
    createdAt: new Date(),
  };
}

/** Partial objects emitted during simulated summary stream. */
export function summaryStreamPartials(
  listing: ListingResult,
  profile: UserProfile,
): Partial<AISummary>[] {
  const full = buildCannedSummary(listing, profile);
  return [
    { tldr: full.tldr },
    {
      keyResponsibilities: full.keyResponsibilities,
      requirements: full.requirements,
    },
    { jdMatch: full.jdMatch, caveats: full.caveats },
  ];
}

export function comparisonStreamPartials(
  listings: ListingResult[],
  profile: UserProfile,
): Partial<ComparisonSummary>[] {
  const full = buildCannedComparison(listings, profile);
  return [
    { summary: full.summary, similarities: full.similarities },
    { differences: full.differences, comparisonPoints: full.comparisonPoints },
    {
      recommendedListingId: full.recommendedListingId,
      recommendationReason: full.recommendationReason,
      listingMatchScores: full.listingMatchScores,
    },
  ];
}
