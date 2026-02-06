/**
 * Summaries service: generate AI job summaries via Gemini, cache by inputTextHash, and CRUD for user summaries.
 */

import { createHash } from "crypto";
import mongoose from "mongoose";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  AISummarySchema,
  type AISummary,
  ComparisonSummarySchema,
  type ComparisonSummary,
} from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  AISummary as AISummaryModel,
  type IAISummaryDocument,
} from "@/lib/models/AISummary";
import { getListingById } from "./listings.service";
import { getProfileByUserId } from "./resume.service";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
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

/** Gets Gemini model; throws if GEMINI_API_KEY is not set. */
function getGeminiModel() {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error("AI summarization is not configured");
  }
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

/** Generates a structured summary from job description text using Gemini with retries. Optionally includes jdMatch when userSkills are provided. */
export async function generateSummaryWithRetry(
  inputText: string,
  options?: { fromAdzunaPage?: boolean; userSkills?: string[] }
): Promise<AISummary> {
  const model = getGeminiModel();
  const fromAdzunaPage = options?.fromAdzunaPage === true;
  const userSkills = options?.userSkills ?? [];
  const hasUserSkills = userSkills.length > 0;
  const intro =
    fromAdzunaPage
      ? "You are scanning the job description of the Adzuna job posting below. The content may include some page layout or navigation; focus on the main job description and summarize it into a structured summary."
      : "You are a job summary assistant for the Singapore job market. Summarize the following job description into a structured summary.";
  const jdMatchRules = hasUserSkills
    ? `
- The candidate's skills are: ${userSkills.join(", ")}. Compare the job description to these skills and output "jdMatch" with:
  - matchScore: number 0-100 (how well the job matches the candidate's skills).
  - matchedSkills: array of skills from the candidate list that appear relevant to the job.
  - missingSkills: array of skills the job requires or prefers that are not in the candidate list (or empty if well matched).`
    : "";
  const prompt = `${intro}

Rules:
- Provide a short tldr (2-3 sentences).
- Extract key responsibilities, requirements, and nice-to-haves as arrays of strings.
- If salary in SGD is mentioned, put it in salarySgd (e.g. "SGD 5,000 - 7,000").
- Add caveats for missing or unclear information.${jdMatchRules}
- Output must match the schema exactly (tldr required; other fields optional).

Job description:
${inputText.slice(0, 30000)}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: AISummarySchema,
        prompt,
      });
      return object as AISummary;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Summary generation failed. Please try again.");
}

/** Resolves create-summary input to text and whether it came from fetching the Adzuna job page. */
async function resolveInputText(input: {
  text?: string;
  url?: string;
  listingId?: string;
}): Promise<{ text: string; fromAdzunaPage?: boolean }> {
  if (input.text?.trim()) return { text: input.text.trim() };

  if (input.listingId) {
    const listing = await getListingById(input.listingId);
    if (!listing) throw new Error("Listing not found");
    const fallbackParts = [listing.title, listing.company, listing.description].filter(Boolean);
    const fallback = fallbackParts.join("\n\n") || listing.title;

    if (!listing.sourceUrl?.trim()) {
      return { text: fallback, fromAdzunaPage: false };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ADZUNA_FETCH_TIMEOUT_MS);
      const res = await fetch(listing.sourceUrl, {
        headers: { "User-Agent": "JobFinderBot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return { text: fallback, fromAdzunaPage: false };
      }
      const html = await res.text();
      const extracted = extractTextFromHtml(html).trim();
      return {
        text: extracted || fallback,
        fromAdzunaPage: !!extracted,
      };
    } catch (err) {
      console.error("Adzuna sourceUrl fetch failed, using fallback:", err instanceof Error ? err.message : String(err));
      return { text: fallback, fromAdzunaPage: false };
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
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user");
  }
  return new mongoose.Types.ObjectId(userId);
}

/** Returns existing summary by inputTextHash within TTL, or generates and saves a new one. */
export async function getOrCreateSummary(
  userId: string,
  input: { text?: string; url?: string; listingId?: string }
): Promise<AISummary & { id: string }> {
  const { text, fromAdzunaPage } = await resolveInputText(input);
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
              (safe.jdMatch as { matchedSkills?: unknown }).matchedSkills
            )
              ? (safe.jdMatch as { matchedSkills: string[] }).matchedSkills
              : undefined,
            missingSkills: Array.isArray(
              (safe.jdMatch as { missingSkills?: unknown }).missingSkills
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
  id: string
): Promise<(AISummary & { id: string }) | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await AISummaryModel.findById(id).lean();
  if (!doc) return null;
  return docToSummary(doc as IAISummaryDocument);
}

/** Returns a summary by id only if owned by userId; otherwise null. */
export async function getSummaryByIdForUser(
  userId: string,
  id: string
): Promise<(AISummary & { id: string }) | null> {
  await connectDB();
  const uid = toObjectIdOrThrow(userId);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await AISummaryModel.findOne({ _id: id, userId: uid }).lean();
  if (!doc) return null;
  return docToSummary(doc as IAISummaryDocument);
}

/** Deletes a summary if the user owns it. Returns true if deleted, false if not found or not owner. */
export async function deleteSummary(
  userId: string,
  id: string
): Promise<boolean> {
  await connectDB();
  const uid = toObjectIdOrThrow(userId);
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const result = await AISummaryModel.deleteOne({ _id: id, userId: uid });
  return result.deletedCount === 1;
}

/** Builds a short text block for one job for the comparison prompt (title, company, description snippet). */
function jobBlock(
  index: number,
  title: string,
  company: string,
  description: string
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

/** Generates a unified comparison summary for 2–3 listings using Gemini. */
export async function generateComparisonSummary(
  listingIds: string[]
): Promise<ComparisonSummary> {
  if (listingIds.length < 2 || listingIds.length > 3) {
    throw new Error("Exactly 2 or 3 listing IDs are required");
  }
  const listings = await Promise.all(
    listingIds.map((id) => getListingById(id))
  );
  for (let i = 0; i < listings.length; i++) {
    if (!listings[i]) {
      throw new Error("Listing not found");
    }
  }
  const blocks = listings.map((l, i) =>
    jobBlock(
      i + 1,
      l!.title,
      l!.company,
      l!.description ?? ""
    )
  );
  const model = getGeminiModel();
  const prompt = `You are a job comparison assistant for the Singapore job market. Compare the following ${listings.length} job listings and produce a unified comparison that summarizes similarities and differences.

${blocks.join("\n\n")}

Rules:
- Write a single "summary" paragraph that synthesizes the comparison: what the roles have in common and how they differ (e.g. seniority, focus, salary, location, requirements).
- Provide "similarities": an array of 3–6 short points describing what is similar across these listings (e.g. all require X, all mention Y, similar industry).
- Provide "differences": an array of 3–6 short points describing key differences (e.g. seniority level, salary range, remote vs on-site, different tech stacks).
- Optionally list 3–6 "comparisonPoints" (additional comparison points if needed).
- If one listing is clearly a better fit for a typical candidate, set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation. Use the job order (Job 1, Job 2, Job 3) – the IDs are: ${listingIds.join(", ")}. recommendedListingId must be one of: ${listingIds.join(", ")}.
- Output must match the schema exactly.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: ComparisonSummarySchema,
        prompt,
      });
      return object as ComparisonSummary;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Comparison generation failed. Please try again.");
}
