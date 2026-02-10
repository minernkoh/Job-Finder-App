/**
 * Summaries service: generate AI job summaries via Gemini, cache by inputTextHash, and CRUD for user summaries.
 */

import { createHash } from "crypto";
import mongoose from "mongoose";
import { generateObject } from "ai";
import {
  AISummarySchema,
  type AISummary,
  ComparisonSummarySchema,
  type ComparisonSummary,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  executeWithGeminiFallback,
  retryWithBackoff,
} from "@/lib/ai/gemini";
import { isValidObjectId } from "@/lib/objectid";
import {
  AISummary as AISummaryModel,
  type IAISummaryDocument,
} from "@/lib/models/AISummary";
import { getListingById } from "./listings.service";
import { getProfileByUserId } from "./resume.service";

const ADZUNA_FETCH_TIMEOUT_MS = 10_000;

/** Strips HTML tags and normalizes whitespace; caps at 30k chars for prompt limit. */
function extractTextFromHtml(html: string): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 30000);
}

/** Returns SHA-256 hex hash of input text for cache key. */
function hashInputText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}

/** Generates a structured summary from job description text using Gemini with retries. Optionally includes jdMatch when userSkills are provided; jobTitle/company anchor role when provided; yearsOfExperience considered for match. */
export async function generateSummaryWithRetry(
  inputText: string,
  options?: {
    fromAdzunaPage?: boolean;
    userSkills?: string[];
    jobTitle?: string;
    company?: string;
    yearsOfExperience?: number;
  },
): Promise<AISummary> {
  const fromAdzunaPage = options?.fromAdzunaPage === true;
  const userSkills = options?.userSkills ?? [];
  const hasUserSkills = userSkills.length > 0;
  const yearsOfExperience = options?.yearsOfExperience;
  const jobTitle = options?.jobTitle?.trim();
  const company = options?.company?.trim();
  const roleContext =
    jobTitle != null && jobTitle !== ""
      ? `Job title: ${jobTitle}${company ? ` | Company: ${company}` : ""}\n\n`
      : "";

  const intro = fromAdzunaPage
    ? "You are scanning the job description of the Adzuna job posting below. The content may include some page layout or navigation; focus on the main job description and summarize it into a structured summary."
    : "You are a job summary assistant for the Singapore job market. Summarize the following job description into a structured summary.";
  const experienceLine =
    yearsOfExperience != null
      ? ` The candidate has ${yearsOfExperience} year(s) of professional experience. When the job description mentions experience requirements (e.g. "5+ years", "3–5 years"), consider this when setting matchScore and include an experience gap in missingSkills if the job asks for more years than the candidate has.`
      : "";
  const jdMatchRules = hasUserSkills
    ? `
- The candidate's skills are: ${userSkills.join(", ")}.${experienceLine} Compare the job description to these skills and output "jdMatch" with:
  - matchScore: number 0-100 (how well the job matches the candidate's skills for this specific role).
  - matchedSkills: array of skills from the candidate list that are actually required or clearly relevant for this job role.
  - missingSkills: array of skills the job requires or prefers that are not in the candidate list (or empty if well matched). Include experience-related gaps here when the job requires more years than the candidate has.
- Consider the job title/role when scoring. Relevance is for this specific role only. Include in matchedSkills only candidate skills that are actually required or clearly relevant for this job role. Do not list a candidate skill as matched just because the job description mentions a related word (e.g. do not match "JavaScript" for an Art Director role unless the role explicitly requires development/technical skills).
- If the job role is clearly unrelated to the candidate's skills (e.g. Art Director vs software engineering), set matchScore low (e.g. 0–30), leave matchedSkills empty or minimal, and set missingSkills to the main skills/experience the job actually requires.`
    : "";
  const prompt = `${intro}

Rules:
- The tldr must describe only the job (role, main duties, key requirements). Do not state whether the candidate is a good fit or has suitable skills; do not address the candidate in the tldr. Provide a short tldr in at most 2-3 short sentences.
- Extract at most 4-5 key responsibilities and at most 4-5 requirements (most important first). Omit nice-to-haves or fold into requirements if needed.
- If salary in SGD is mentioned, put it in salarySgd (e.g. "SGD 5,000 - 7,000").
- Add caveats for missing or unclear information.${jdMatchRules}
- Output must match the schema exactly (tldr required; other fields optional).

${roleContext}Job description:
${inputText.slice(0, 30000)}`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGeminiFallback((model) =>
        generateObject({ model, schema: AISummarySchema, prompt }),
      ),
    { fallbackMessage: "Summary generation failed. Please try again." },
  );
  return object as AISummary;
}

/** Resolves create-summary input to text, optional Adzuna flag, and when input is listingId also returns jobTitle and company for prompt context. */
async function resolveInputText(input: {
  text?: string;
  url?: string;
  listingId?: string;
}): Promise<{
  text: string;
  fromAdzunaPage?: boolean;
  jobTitle?: string;
  company?: string;
}> {
  if (input.text?.trim()) return { text: input.text.trim() };

  if (input.listingId) {
    const listing = await getListingById(input.listingId);
    if (!listing) throw new Error("Listing not found");
    const fallbackParts = [
      listing.title,
      listing.company,
      listing.description,
    ].filter(Boolean);
    const fallback = fallbackParts.join("\n\n") || listing.title;
    const jobTitle = listing.title?.trim() || undefined;
    const company = listing.company?.trim() || undefined;

    if (!listing.sourceUrl?.trim()) {
      return { text: fallback, fromAdzunaPage: false, jobTitle, company };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        ADZUNA_FETCH_TIMEOUT_MS,
      );
      const res = await fetch(listing.sourceUrl, {
        headers: { "User-Agent": "JobFinderBot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return { text: fallback, fromAdzunaPage: false, jobTitle, company };
      }
      const html = await res.text();
      const extracted = extractTextFromHtml(html).trim();
      return {
        text: extracted || fallback,
        fromAdzunaPage: !!extracted,
        jobTitle,
        company,
      };
    } catch {
      return { text: fallback, fromAdzunaPage: false, jobTitle, company };
    }
  }

  if (input.url) {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "JobFinderBot/1.0" },
    });
    if (!res.ok) throw new Error("Could not fetch URL");
    const html = await res.text();
    const text = extractTextFromHtml(html) || "No text content found.";
    return { text };
  }

  throw new Error("At least one of listingId, text, or url is required");
}

/** Maps DB document to API AISummary shape with id. */
function docToSummary(doc: IAISummaryDocument): AISummary & { id: string } {
  return {
    id: String(doc._id),
    tldr: doc.tldr,
    keyResponsibilities: doc.keyResponsibilities,
    requirements: doc.requirements,
    niceToHaves: doc.niceToHaves,
    salarySgd: doc.salarySgd,
    jdMatch: doc.jdMatch,
    caveats: doc.caveats,
    inputTextHash: doc.inputTextHash,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Throws if userId is not a valid MongoDB ObjectId (so route can return 401). */
function toObjectIdOrThrow(userId: string): mongoose.Types.ObjectId {
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user");
  }
  return new mongoose.Types.ObjectId(userId);
}

/** Returns existing summary by inputTextHash within TTL, or generates and saves a new one. */
export async function getOrCreateSummary(
  userId: string,
  input: { text?: string; url?: string; listingId?: string },
): Promise<AISummary & { id: string }> {
  const { text, fromAdzunaPage, jobTitle, company } =
    await resolveInputText(input);
  const inputTextHash = hashInputText(text);
  const env = getEnv();
  const ttlSeconds = env.AI_SUMMARY_CACHE_TTL ?? 604800;
  const since = new Date(Date.now() - ttlSeconds * 1000);

  await connectDB();
  const uid = toObjectIdOrThrow(userId);
  const existing = await AISummaryModel.findOne({
    inputTextHash,
    userId: uid,
    updatedAt: { $gte: since },
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (existing) {
    return docToSummary(existing as IAISummaryDocument);
  }

  const profile = await getProfileByUserId(userId);
  const userSkills =
    profile && profile.skills.length > 0 ? profile.skills : undefined;
  const generated = await generateSummaryWithRetry(text, {
    fromAdzunaPage,
    userSkills,
    jobTitle,
    company,
    yearsOfExperience: profile?.yearsOfExperience,
  });
  const parsed = AISummarySchema.safeParse(generated);
  const safe = parsed.success
    ? parsed.data
    : { tldr: String(generated?.tldr ?? "Summary unavailable.") };
  const doc = await AISummaryModel.create({
    userId: uid,
    inputTextHash,
    tldr: safe.tldr,
    keyResponsibilities: Array.isArray(safe.keyResponsibilities)
      ? safe.keyResponsibilities
      : undefined,
    requirements: Array.isArray(safe.requirements)
      ? safe.requirements
      : undefined,
    niceToHaves: Array.isArray(safe.niceToHaves) ? safe.niceToHaves : undefined,
    salarySgd: typeof safe.salarySgd === "string" ? safe.salarySgd : undefined,
    jdMatch:
      safe.jdMatch &&
      typeof safe.jdMatch === "object" &&
      !Array.isArray(safe.jdMatch)
        ? {
            matchScore:
              typeof (safe.jdMatch as { matchScore?: unknown }).matchScore ===
              "number"
                ? (safe.jdMatch as { matchScore: number }).matchScore
                : undefined,
            matchedSkills: Array.isArray(
              (safe.jdMatch as { matchedSkills?: unknown }).matchedSkills,
            )
              ? (safe.jdMatch as { matchedSkills: string[] }).matchedSkills
              : undefined,
            missingSkills: Array.isArray(
              (safe.jdMatch as { missingSkills?: unknown }).missingSkills,
            )
              ? (safe.jdMatch as { missingSkills: string[] }).missingSkills
              : undefined,
          }
        : undefined,
    caveats: Array.isArray(safe.caveats) ? safe.caveats : undefined,
  });
  return docToSummary(doc);
}

/** Returns a summary by id or null if not found. */
export async function getSummaryById(
  id: string,
): Promise<(AISummary & { id: string }) | null> {
  await connectDB();
  if (!isValidObjectId(id)) return null;
  const doc = await AISummaryModel.findById(id).lean();
  if (!doc) return null;
  return docToSummary(doc as IAISummaryDocument);
}

/** Returns a summary by id only if owned by userId; otherwise null. */
export async function getSummaryByIdForUser(
  userId: string,
  id: string,
): Promise<(AISummary & { id: string }) | null> {
  await connectDB();
  const uid = toObjectIdOrThrow(userId);
  if (!isValidObjectId(id)) return null;
  const doc = await AISummaryModel.findOne({ _id: id, userId: uid }).lean();
  if (!doc) return null;
  return docToSummary(doc as IAISummaryDocument);
}

/** Deletes a summary if the user owns it. Returns true if deleted, false if not found or not owner. */
export async function deleteSummary(
  userId: string,
  id: string,
): Promise<boolean> {
  await connectDB();
  const uid = toObjectIdOrThrow(userId);
  if (!isValidObjectId(id)) return false;
  const result = await AISummaryModel.deleteOne({ _id: id, userId: uid });
  return result.deletedCount === 1;
}

/** Builds a short text block for one job for the comparison prompt (title, company, description snippet). */
function jobBlock(
  index: number,
  title: string,
  company: string,
  description: string,
): string {
  const snippet = description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  return `--- Job ${index} ---
Title: ${title}
Company: ${company}
Description:
${snippet}`;
}

/** Options for comparison summary: candidate context so the recommendation is based on their skills and experience. */
export interface ComparisonSummaryOptions {
  userSkills?: string[];
  currentRole?: string;
  yearsOfExperience?: number;
}

/** Generates a unified comparison summary for 2–3 listings using Gemini. Optionally uses candidate skills/role for a "better fit for you" recommendation. */
export async function generateComparisonSummary(
  listingIds: string[],
  options?: ComparisonSummaryOptions,
): Promise<ComparisonSummary> {
  if (listingIds.length < 2 || listingIds.length > 3) {
    throw new Error("Exactly 2 or 3 listing IDs are required");
  }
  const listings = await Promise.all(
    listingIds.map((id) => getListingById(id)),
  );
  for (let i = 0; i < listings.length; i++) {
    if (!listings[i]) {
      throw new Error("Listing not found");
    }
  }
  const blocks = listings.map((l, i) =>
    jobBlock(i + 1, l!.title, l!.company, l!.description ?? ""),
  );
  const userSkills = options?.userSkills ?? [];
  const currentRole = options?.currentRole;
  const yearsOfExperience = options?.yearsOfExperience;
  const hasCandidateContext =
    userSkills.length > 0 ||
    (currentRole != null && currentRole.trim() !== "") ||
    yearsOfExperience != null;
  const candidateContext = hasCandidateContext
    ? `
The candidate's context (use this to recommend which job is the better fit for them):
- Skills: ${userSkills.length > 0 ? userSkills.join(", ") : "Not provided"}
${currentRole != null && currentRole.trim() !== "" ? `- Current or target role: ${currentRole.trim()}` : ""}
${yearsOfExperience != null ? `- Years of experience: ${yearsOfExperience}` : ""}

Given this candidate's skills and experience, which listing is the better fit? Set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation based on this candidate's skills and experience.`
    : `
If one listing is clearly a better fit for a typical candidate, set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation.`;
  const prompt = `You are a job comparison assistant for the Singapore job market. Compare the following ${listings.length} job listings and produce a unified comparison that summarizes similarities and differences.

${blocks.join("\n\n")}

Rules:
- Write a single "summary" paragraph that synthesizes the comparison: what the roles have in common and how they differ (e.g. seniority, focus, salary, location, requirements).
- Provide "similarities": an array of 3–6 short points describing what is similar across these listings (e.g. all require X, all mention Y, similar industry).
- Provide "differences": an array of 3–6 short points describing key differences (e.g. seniority level, salary range, remote vs on-site, different tech stacks).
- Optionally list 3–6 "comparisonPoints" (additional comparison points if needed).
- Use the job order (Job 1, Job 2, Job 3) – the IDs are: ${listingIds.join(", ")}. recommendedListingId must be one of: ${listingIds.join(", ")}.${candidateContext}
- Output must match the schema exactly.`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGeminiFallback((model) =>
        generateObject({ model, schema: ComparisonSummarySchema, prompt }),
      ),
    { fallbackMessage: "Comparison generation failed. Please try again." },
  );
  return object as ComparisonSummary;
}
