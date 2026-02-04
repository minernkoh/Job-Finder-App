/**
 * Summaries service: generate AI job summaries via Gemini, cache by inputTextHash, and CRUD for user summaries.
 */

import { createHash } from "crypto";
import mongoose from "mongoose";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AISummarySchema, type AISummary } from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  AISummary as AISummaryModel,
  type IAISummaryDocument,
} from "@/lib/models/AISummary";
import { getListingById } from "./listings.service";

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

/** Generates a structured summary from job description text using Gemini with retries. */
export async function generateSummaryWithRetry(
  inputText: string,
  options?: { fromAdzunaPage?: boolean }
): Promise<AISummary> {
  const model = getGeminiModel();
  const fromAdzunaPage = options?.fromAdzunaPage === true;
  const intro =
    fromAdzunaPage
      ? "You are scanning the job description of the Adzuna job posting below. The content may include some page layout or navigation; focus on the main job description and summarize it into a structured summary."
      : "You are a job summary assistant for the Singapore job market. Summarize the following job description into a structured summary.";
  const prompt = `${intro}

Rules:
- Provide a short tldr (2-3 sentences).
- Extract key responsibilities, requirements, and nice-to-haves as arrays of strings.
- If salary in SGD is mentioned, put it in salarySgd (e.g. "SGD 5,000 - 7,000").
- If SkillsFuture-related keywords appear (e.g. skills, training, certifications), list them in skillsFutureKeywords.
- Add caveats for missing or unclear information.
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
    skillsFutureKeywords: doc.skillsFutureKeywords,
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

  const generated = await generateSummaryWithRetry(text, { fromAdzunaPage });
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
    skillsFutureKeywords: Array.isArray(safe.skillsFutureKeywords)
      ? safe.skillsFutureKeywords
      : undefined,
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
