/**
 * Resume tailor: rewrite a master profile against one JD. Never invents facts.
 */

import { createHash } from "crypto";
import mongoose from "mongoose";
import { generateObject } from "ai";
import {
  TailorLlmResultSchema,
  TailoredResumeContentSchema,
  type TailoredResumeContent,
  type TailoredResumeResult,
  type UserProfile,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { executeWithGemini, retryWithBackoff } from "@/lib/ai/gemini";
import { consumeAiQuota } from "@/lib/services/ai-quota.service";
import { getListingById } from "@/lib/services/listings.service";
import { getProfileByUserId } from "@/lib/services/resume.service";
import { TailoredResume } from "@/lib/models/TailoredResume";
import { isValidObjectId } from "@/lib/objectid";
import { stripHtmlToText } from "@/lib/text";

export function hashMasterProfile(profile: UserProfile): string {
  const payload = JSON.stringify({
    name: profile.name ?? "",
    headline: profile.headline ?? "",
    contacts: profile.contacts ?? {},
    experience: profile.experience ?? [],
    projects: profile.projects ?? [],
    education: profile.education ?? [],
    honours: profile.honours ?? [],
    skillGroups: profile.skillGroups ?? [],
    skills: profile.skills ?? [],
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

function metricTokens(text: string): Set<string> {
  return new Set(text.match(/\$[\d.,]+[mkMK+]*|\d+%/g) ?? []);
}

function verifyTruthful(profile: UserProfile, out: TailoredResumeContent): string[] {
  const warnings: string[] = [];
  const realCompanies = new Set(
    (profile.experience ?? []).map((e) => e.company.toLowerCase()),
  );
  const realTitles = new Set(
    (profile.experience ?? []).map((e) => e.title.toLowerCase()),
  );
  for (const e of out.experience) {
    if (!realCompanies.has(e.company.toLowerCase())) {
      warnings.push(`fabricated company: ${e.company}`);
    }
    if (!realTitles.has(e.title.toLowerCase())) {
      warnings.push(`altered title: ${e.title}`);
    }
  }
  const profNums = metricTokens(JSON.stringify(profile.experience ?? []));
  const outNums = metricTokens(JSON.stringify(out.experience));
  for (const n of outNums) {
    if (!profNums.has(n)) warnings.push(`unverified metric introduced: ${n}`);
  }
  return warnings;
}

function periodForCompany(profile: UserProfile, company: string): string | undefined {
  const match = (profile.experience ?? []).find(
    (e) => e.company.toLowerCase() === company.toLowerCase(),
  );
  if (!match) return undefined;
  if (match.period?.trim()) return match.period;
  if (match.start || match.end) {
    return `${match.start ?? ""} – ${match.end ?? ""}`.trim();
  }
  return undefined;
}

export async function tailorResumeForListing(
  userId: string,
  listingId: string,
  forceRegenerate = false,
): Promise<TailoredResumeResult> {
  if (!isValidObjectId(userId) || !isValidObjectId(listingId)) {
    throw new Error("Invalid id");
  }
  await connectDB();
  const profile = await getProfileByUserId(userId);
  if (!profile || !(profile.experience?.length)) {
    throw new Error(
      "Add work experience to your master profile before tailoring a resume.",
    );
  }
  if (!profile.name?.trim()) {
    throw new Error("Add your name to the master profile before tailoring.");
  }

  const listing = await getListingById(listingId);
  if (!listing) throw new Error("Listing not found");

  const profileHash = hashMasterProfile(profile);
  const uid = new mongoose.Types.ObjectId(userId);
  const lid = new mongoose.Types.ObjectId(listingId);

  if (!forceRegenerate) {
    const cached = await TailoredResume.findOne({
      userId: uid,
      listingId: lid,
      profileHash,
    }).lean();
    if (cached) {
      return {
        id: String(cached._id),
        listingId,
        listingTitle: cached.listingTitle,
        listingCompany: cached.listingCompany,
        content: cached.content,
        createdAt: cached.createdAt,
      };
    }
  }

  const jd = stripHtmlToText(listing.description ?? "").slice(0, 6000);
  if (!jd.trim()) {
    throw new Error("This listing has no job description to tailor against.");
  }

  await consumeAiQuota(userId, "tailor");

  const skillGroupNames = (profile.skillGroups ?? []).map((g) => g.name);
  const profileJson = JSON.stringify(profile, null, 2);

  const prompt = `You are an expert resume writer tailoring a candidate's resume to ONE job.

ABSOLUTE RULES — a fabrication is worse than a weak match:
- Use ONLY facts present in MASTER_PROFILE. Never invent employers, job titles,
  dates, metrics, tools, or skills the candidate does not list.
- You MAY reorder and rephrase existing bullets to surface the keywords and
  responsibilities in the JOB DESCRIPTION (ATS optimisation), and drop bullets
  that are irrelevant. Keep every company/title/date exactly as given.
- Preserve all quantified metrics ($3M+, 80%, 70%) verbatim — do not alter numbers.
- If the job needs something the candidate lacks, put it in gaps, do NOT bluff it.

Return JSON:
- summary: 2 sentences, tuned to this role, drawn from the candidate's real background.
- experience: same companies/titles as MASTER_PROFILE, in the same order, each with
  bullets reworded/reordered/filtered for this JD (max 3 bullets each).
- skillsOrder: the MASTER_PROFILE skill group names, reordered so the groups most
  relevant to this JD come first. Use the exact group names: ${skillGroupNames.join(", ") || "(none)"}.
- matchScore: 0-100, honest fit of candidate to JD.
- gaps: short bullet list of JD requirements the candidate does not clearly meet.
- coverLetter: 3 short paragraphs, first-person, specific to the company and role,
  grounded only in real experience. No placeholders like [Company].

MASTER_PROFILE:
${profileJson}

JOB:
Title: ${listing.title}
Company: ${listing.company}
Description:
${jd}`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGemini((model) =>
        generateObject({ model, schema: TailorLlmResultSchema, prompt }),
      ),
    { fallbackMessage: "Resume tailoring failed. Please try again." },
  );

  const groups = profile.skillGroups ?? [];
  const groupByName = new Map(groups.map((g) => [g.name, g]));
  const order = [
    ...(object.skillsOrder ?? []).filter((n) => groupByName.has(n)),
    ...groups.map((g) => g.name).filter((n) => !(object.skillsOrder ?? []).includes(n)),
  ];
  const skillGroups = order.map((n) => groupByName.get(n)!).filter(Boolean);

  const contentDraft: TailoredResumeContent = {
    name: profile.name,
    headline: profile.headline,
    contacts: profile.contacts,
    summary: object.summary,
    experience: object.experience.map((e) => ({
      company: e.company,
      title: e.title,
      period: periodForCompany(profile, e.company),
      bullets: e.bullets,
    })),
    skillGroups,
    projects: profile.projects,
    education: profile.education,
    honours: profile.honours,
    matchScore: object.matchScore,
    gaps: object.gaps,
    coverLetter: object.coverLetter,
    warnings: [],
  };

  const parsed = TailoredResumeContentSchema.safeParse({
    ...contentDraft,
    warnings: verifyTruthful(profile, contentDraft),
  });
  const content = parsed.success
    ? parsed.data
    : { ...contentDraft, warnings: ["Model output failed schema checks; review carefully."] };

  const doc = await TailoredResume.findOneAndUpdate(
    { userId: uid, listingId: lid, profileHash },
    {
      $set: {
        listingTitle: listing.title,
        listingCompany: listing.company,
        content,
      },
    },
    { upsert: true, new: true },
  );

  return {
    id: String(doc._id),
    listingId,
    listingTitle: listing.title,
    listingCompany: listing.company,
    content,
    createdAt: doc.createdAt,
  };
}

export async function getTailoredResumeForUser(
  userId: string,
  tailorId: string,
): Promise<ITailoredLean | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(tailorId)) return null;
  await connectDB();
  const doc = await TailoredResume.findOne({
    _id: tailorId,
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  if (!doc) return null;
  return {
    id: String(doc._id),
    listingId: String(doc.listingId),
    listingTitle: doc.listingTitle,
    listingCompany: doc.listingCompany,
    content: doc.content,
  };
}

export interface ITailoredLean {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCompany: string;
  content: TailoredResumeContent;
}
