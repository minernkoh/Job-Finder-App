/**
 * Summaries service: generate AI job summaries via Gemini, cache by inputTextHash, and CRUD for user summaries.
 */

import { createHash } from "crypto";
import { generateObject, streamObject } from "ai";
import {
  AISummarySchema,
  type AISummary,
  ComparisonSummarySchema,
  type ComparisonSummary,
} from "@schemas";
import { getSql } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { executeWithGemini, retryWithBackoff } from "@/lib/ai/gemini";
import { isValidObjectId } from "@/lib/objectid";
import { getListingById } from "./listings.service";
import { getProfileByUserId } from "./resume.service";

const ADZUNA_FETCH_TIMEOUT_MS = 10_000;

/** An ai_summaries row (camelCase via the db client's transform). */
interface AISummaryRow {
  id: string;
  userId: string;
  inputTextHash: string;
  tldr: string;
  keyResponsibilities?: string[];
  requirements?: string[];
  niceToHaves?: string[];
  salarySgd?: string;
  jdMatch?: AISummary["jdMatch"];
  caveats?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** A comparison_summaries row (camelCase via the db client's transform). */
interface ComparisonSummaryRow {
  id: string;
  userId: string;
  listingIdsKey: string;
  summary: string;
  similarities?: string[];
  differences?: string[];
  comparisonPoints?: string[];
  recommendedListingId?: string;
  recommendationReason?: string;
  listingMatchScores?: ComparisonSummary["listingMatchScores"];
  createdAt: Date;
  updatedAt: Date;
}

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
      ? ` You have ${yearsOfExperience} year(s) of professional experience. When the job description mentions experience requirements (e.g. "5+ years", "3–5 years"), consider this when setting matchScore and include an experience gap in missingSkills if the job asks for more years than you have.`
      : "";
  const jdMatchRules = hasUserSkills
    ? `
- Your skills are: ${userSkills.join(", ")}.${experienceLine} Compare the job description to these skills and output "jdMatch" with:
  - matchScore: number 0-100 (how well the job matches your skills for this specific role).
  - matchedSkills: array of skills from your list that are actually required or clearly relevant for this job role. When there are no matching skills, output matchedSkills as an empty array [] (do not omit it).
  - missingSkills: array of skills the job requires or prefers that are not in your skills list (or empty if well matched). Include experience-related gaps here when the job requires more years than you have.
- Consider the job title/role when scoring. Relevance is for this specific role only. Include in matchedSkills only skills from your list that are actually required or clearly relevant for this job role. Do not list one of your skills as matched just because the job description mentions a related word (e.g. do not match "JavaScript" for an Art Director role unless the role explicitly requires development/technical skills).
- If the job role is clearly unrelated to your skills (e.g. Art Director vs software engineering), set matchScore low (e.g. 0–30), set matchedSkills to [], and set missingSkills to the main skills/experience the job actually requires.`
    : "";
  const prompt = `${intro}

Rules:
- The tldr must describe only the job (role, main duties, key requirements). Do not state whether you are a good fit or have suitable skills; do not address the user in the tldr. Provide a short tldr in at most 2-3 short sentences.
- Extract at most 4-5 key responsibilities and at most 4-5 requirements (most important first). Omit nice-to-haves or fold into requirements if needed.
- If salary in SGD is mentioned, put it in salarySgd (e.g. "SGD 5,000 - 7,000").
- Add caveats for missing or unclear information.${jdMatchRules}
- When describing match results, skills, or recommendations, use second-person ("you", "your") — never "the candidate".
- Output must match the schema exactly (tldr required; other fields optional).

${roleContext}Job description:
${inputText.slice(0, 30000)}`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGemini((model) =>
        generateObject({ model, schema: AISummarySchema, prompt }),
      ),
    { fallbackMessage: "Summary generation failed. Please try again." },
  );
  return object as AISummary;
}

/** Streaming summary result: async iterable of partial objects plus a promise for the final complete object. */
export interface SummaryStreamResult {
  partialObjectStream: AsyncIterable<Partial<AISummary>>;
  object: Promise<AISummary>;
}

/** Generates a streaming summary using Gemini via streamObject. Returns the partialObjectStream and the final object promise. */
export async function generateSummaryStream(
  inputText: string,
  options?: {
    fromAdzunaPage?: boolean;
    userSkills?: string[];
    jobTitle?: string;
    company?: string;
    yearsOfExperience?: number;
  },
): Promise<SummaryStreamResult> {
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
      ? ` You have ${yearsOfExperience} year(s) of professional experience. When the job description mentions experience requirements (e.g. "5+ years", "3–5 years"), consider this when setting matchScore and include an experience gap in missingSkills if the job asks for more years than you have.`
      : "";
  const jdMatchRules = hasUserSkills
    ? `
- Your skills are: ${userSkills.join(", ")}.${experienceLine} Compare the job description to these skills and output "jdMatch" with:
  - matchScore: number 0-100 (how well the job matches your skills for this specific role).
  - matchedSkills: array of skills from your list that are actually required or clearly relevant for this job role. When there are no matching skills, output matchedSkills as an empty array [] (do not omit it).
  - missingSkills: array of skills the job requires or prefers that are not in your skills list (or empty if well matched). Include experience-related gaps here when the job requires more years than you have.
- Consider the job title/role when scoring. Relevance is for this specific role only. Include in matchedSkills only skills from your list that are actually required or clearly relevant for this job role. Do not list one of your skills as matched just because the job description mentions a related word (e.g. do not match "JavaScript" for an Art Director role unless the role explicitly requires development/technical skills).
- If the job role is clearly unrelated to your skills (e.g. Art Director vs software engineering), set matchScore low (e.g. 0–30), set matchedSkills to [], and set missingSkills to the main skills/experience the job actually requires.`
    : "";
  const prompt = `${intro}

Rules:
- The tldr must describe only the job (role, main duties, key requirements). Do not state whether you are a good fit or have suitable skills; do not address the user in the tldr. Provide a short tldr in at most 2-3 short sentences.
- Extract at most 4-5 key responsibilities and at most 4-5 requirements (most important first). Omit nice-to-haves or fold into requirements if needed.
- If salary in SGD is mentioned, put it in salarySgd (e.g. "SGD 5,000 - 7,000").
- Add caveats for missing or unclear information.${jdMatchRules}
- When describing match results, skills, or recommendations, use second-person ("you", "your") — never "the candidate".
- Output must match the schema exactly (tldr required; other fields optional).

${roleContext}Job description:
${inputText.slice(0, 30000)}`;

  return executeWithGemini((model) => {
    const result = streamObject({
      model,
      schema: AISummarySchema,
      prompt,
    });
    return Promise.resolve({
      partialObjectStream: result.partialObjectStream as AsyncIterable<
        Partial<AISummary>
      >,
      object: result.object as Promise<AISummary>,
    });
  });
}

/**
 * Checks the cache for an existing summary; if found returns { cached: true, data }.
 * On cache miss, resolves input text and returns { cached: false, resolvedInput } so the caller can stream.
 */
export async function prepareSummaryStream(
  userId: string,
  input: {
    text?: string;
    url?: string;
    listingId?: string;
    forceRegenerate?: boolean;
  },
): Promise<
  | { cached: true; data: AISummary & { id: string } }
  | {
      cached: false;
      resolvedInput: {
        text: string;
        fromAdzunaPage?: boolean;
        jobTitle?: string;
        company?: string;
      };
      inputTextHash: string;
      uid: string;
      userSkills?: string[];
      yearsOfExperience?: number;
    }
> {
  const { text, fromAdzunaPage, jobTitle, company } =
    await resolveInputText(input);
  const inputTextHash = hashInputText(text);
  const env = getEnv();
  const ttlSeconds = env.AI_SUMMARY_CACHE_TTL ?? 604800;
  const since = new Date(Date.now() - ttlSeconds * 1000);

  const uid = toUserIdOrThrow(userId);

  if (input.forceRegenerate !== true) {
    const existing = await findCachedSummary(inputTextHash, uid, since);
    if (existing) {
      return { cached: true, data: docToSummary(existing) };
    }
  }

  const profile = await getProfileByUserId(userId);
  const userSkills =
    profile && profile.skills.length > 0 ? profile.skills : undefined;

  return {
    cached: false,
    resolvedInput: { text, fromAdzunaPage, jobTitle, company },
    inputTextHash,
    uid,
    userSkills,
    yearsOfExperience: profile?.yearsOfExperience,
  };
}

/**
 * Saves a generated summary to MongoDB after streaming completes. Returns the saved summary with id.
 */
export async function saveSummaryToDb(
  uid: string,
  inputTextHash: string,
  generated: AISummary,
): Promise<AISummary & { id: string }> {
  const parsed = AISummarySchema.safeParse(generated);
  const safe: AISummary = parsed.success
    ? parsed.data
    : { tldr: String(generated?.tldr ?? "Summary unavailable.") };
  const sql = getSql();
  const [row] = (await sql`
    insert into ai_summaries
      (user_id, input_text_hash, tldr, key_responsibilities, requirements, nice_to_haves, salary_sgd, jd_match, caveats)
    values (
      ${uid}, ${inputTextHash}, ${safe.tldr},
      ${safe.keyResponsibilities ?? null}, ${safe.requirements ?? null}, ${safe.niceToHaves ?? null},
      ${safe.salarySgd ?? null}, ${safe.jdMatch ? sql.json(safe.jdMatch) : null}, ${safe.caveats ?? null}
    )
    returning *
  `) as unknown as AISummaryRow[];
  return docToSummary(row);
}

/** Finds the most recent cached summary for a user/hash within TTL, or null. */
async function findCachedSummary(
  inputTextHash: string,
  uid: string,
  since: Date,
): Promise<AISummaryRow | null> {
  const sql = getSql();
  const [row] = (await sql`
    select * from ai_summaries
    where input_text_hash = ${inputTextHash} and user_id = ${uid} and updated_at >= ${since}
    order by updated_at desc
    limit 1
  `) as unknown as AISummaryRow[];
  return row ?? null;
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
    if (!res.ok) {
      throw new Error(
        "Could not fetch URL; the link may be invalid or inaccessible from the server.",
      );
    }
    const html = await res.text();
    const text = extractTextFromHtml(html) || "No text content found.";
    return { text };
  }

  throw new Error("At least one of listingId, text, or url is required");
}

/** Maps DB row to API AISummary shape with id. */
function docToSummary(doc: AISummaryRow): AISummary & { id: string } {
  return {
    id: doc.id,
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

/** Throws if userId is not a valid UUID (so route can return 401). */
function toUserIdOrThrow(userId: string): string {
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user");
  }
  return userId;
}

/** Returns existing summary for a listing by inputTextHash + userId, or null if not found. Does not create or generate. */
export async function getSummaryForListing(
  userId: string,
  listingId: string,
): Promise<(AISummary & { id: string }) | null> {
  const { text } = await resolveInputText({ listingId });
  const inputTextHash = hashInputText(text);
  const env = getEnv();
  const ttlSeconds = env.AI_SUMMARY_CACHE_TTL ?? 604800;
  const since = new Date(Date.now() - ttlSeconds * 1000);

  const uid = toUserIdOrThrow(userId);
  const doc = await findCachedSummary(inputTextHash, uid, since);
  if (!doc) return null;
  return docToSummary(doc);
}

/** Returns existing summary by inputTextHash within TTL, or generates and saves a new one. */
export async function getOrCreateSummary(
  userId: string,
  input: {
    text?: string;
    url?: string;
    listingId?: string;
    forceRegenerate?: boolean;
  },
): Promise<AISummary & { id: string }> {
  const { text, fromAdzunaPage, jobTitle, company } =
    await resolveInputText(input);
  const inputTextHash = hashInputText(text);
  const env = getEnv();
  const ttlSeconds = env.AI_SUMMARY_CACHE_TTL ?? 604800;
  const since = new Date(Date.now() - ttlSeconds * 1000);

  const uid = toUserIdOrThrow(userId);

  if (input.forceRegenerate !== true) {
    const existing = await findCachedSummary(inputTextHash, uid, since);
    if (existing) {
      return docToSummary(existing);
    }
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
  return saveSummaryToDb(uid, inputTextHash, generated);
}

/** Returns a summary by id or null if not found. */
export async function getSummaryById(
  id: string,
): Promise<(AISummary & { id: string }) | null> {
  if (!isValidObjectId(id)) return null;
  const sql = getSql();
  const [doc] = (await sql`select * from ai_summaries where id = ${id}`) as unknown as AISummaryRow[];
  if (!doc) return null;
  return docToSummary(doc);
}

/** Returns a summary by id only if owned by userId; otherwise null. */
export async function getSummaryByIdForUser(
  userId: string,
  id: string,
): Promise<(AISummary & { id: string }) | null> {
  const uid = toUserIdOrThrow(userId);
  if (!isValidObjectId(id)) return null;
  const sql = getSql();
  const [doc] = (await sql`
    select * from ai_summaries where id = ${id} and user_id = ${uid}
  `) as unknown as AISummaryRow[];
  if (!doc) return null;
  return docToSummary(doc);
}

/** Deletes a summary if the user owns it. Returns true if deleted, false if not found or not owner. */
export async function deleteSummary(
  userId: string,
  id: string,
): Promise<boolean> {
  const uid = toUserIdOrThrow(userId);
  if (!isValidObjectId(id)) return false;
  const sql = getSql();
  const rows = (await sql`
    delete from ai_summaries where id = ${id} and user_id = ${uid} returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length === 1;
}

/** Builds canonical cache key from listing IDs (sorted so [a,b] and [b,a] match). */
function toListingIdsKey(listingIds: string[]): string {
  return [...listingIds].sort().join(",");
}

/** Maps comparison_summaries row to plain ComparisonSummary for API response. */
function docToComparisonSummary(
  doc: ComparisonSummaryRow
): ComparisonSummary {
  return {
    summary: doc.summary,
    similarities: doc.similarities,
    differences: doc.differences,
    comparisonPoints: doc.comparisonPoints,
    recommendedListingId: doc.recommendedListingId,
    recommendationReason: doc.recommendationReason,
    listingMatchScores: doc.listingMatchScores,
  };
}

/**
 * Checks the cache for an existing comparison summary; if found returns { cached: true, data }.
 * On cache miss returns { cached: false } so the caller can generate and stream.
 */
export async function prepareComparisonStream(
  userId: string,
  input: {
    listingIds: string[];
    forceRegenerate?: boolean;
  }
): Promise<
  | { cached: true; data: ComparisonSummary }
  | { cached: false }
> {
  if (input.listingIds.length < 2 || input.listingIds.length > 3) {
    throw new Error("Exactly 2 or 3 listing IDs are required");
  }
  const listingIdsKey = toListingIdsKey(input.listingIds);
  const env = getEnv();
  const ttlSeconds = env.AI_SUMMARY_CACHE_TTL ?? 604800;
  const since = new Date(Date.now() - ttlSeconds * 1000);

  const uid = toUserIdOrThrow(userId);

  if (input.forceRegenerate !== true) {
    const sql = getSql();
    const [existing] = (await sql`
      select * from comparison_summaries
      where user_id = ${uid} and listing_ids_key = ${listingIdsKey} and updated_at >= ${since}
      order by updated_at desc
      limit 1
    `) as unknown as ComparisonSummaryRow[];

    if (existing) {
      return { cached: true, data: docToComparisonSummary(existing) };
    }
  }

  return { cached: false };
}

/**
 * Saves a generated comparison summary after streaming completes (upsert by user + listing key).
 */
export async function saveComparisonSummaryToDb(
  userId: string,
  listingIds: string[],
  comparison: ComparisonSummary
): Promise<ComparisonSummary> {
  const parsed = ComparisonSummarySchema.safeParse(comparison);
  const safe: ComparisonSummary = parsed.success
    ? parsed.data
    : { summary: String(comparison?.summary ?? "Comparison unavailable.") };
  const listingIdsKey = toListingIdsKey(listingIds);

  const uid = toUserIdOrThrow(userId);
  const sql = getSql();

  const [row] = (await sql`
    insert into comparison_summaries
      (user_id, listing_ids_key, summary, similarities, differences, comparison_points, recommended_listing_id, recommendation_reason, listing_match_scores)
    values (
      ${uid}, ${listingIdsKey}, ${safe.summary},
      ${safe.similarities ?? null}, ${safe.differences ?? null}, ${safe.comparisonPoints ?? null},
      ${safe.recommendedListingId ?? null}, ${safe.recommendationReason ?? null},
      ${safe.listingMatchScores ? sql.json(safe.listingMatchScores) : null}
    )
    on conflict (user_id, listing_ids_key) do update set
      summary = excluded.summary,
      similarities = excluded.similarities,
      differences = excluded.differences,
      comparison_points = excluded.comparison_points,
      recommended_listing_id = excluded.recommended_listing_id,
      recommendation_reason = excluded.recommendation_reason,
      listing_match_scores = excluded.listing_match_scores,
      updated_at = now()
    returning *
  `) as unknown as ComparisonSummaryRow[];

  return docToComparisonSummary(row);
}

/** Builds a short text block for one job for the comparison prompt (title, company, description snippet). */
function jobBlock(
  index: number,
  title: string,
  company: string,
  description: string,
): string {
  const snippet = extractTextFromHtml(description).slice(0, 4000);
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
Your context (use this to recommend which job is the better fit for you):
- Skills: ${userSkills.length > 0 ? userSkills.join(", ") : "Not provided"}
${currentRole != null && currentRole.trim() !== "" ? `- Current or target role: ${currentRole.trim()}` : ""}
${yearsOfExperience != null ? `- Years of experience: ${yearsOfExperience}` : ""}

Given your skills and experience, which listing is the better fit for you? Set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation based on your skills and experience.`
    : `
If one listing is clearly a better fit for a typical applicant, set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation.`;
  const skillsMatchRules =
    userSkills.length > 0
      ? `
- The "summary" paragraph MUST include how each listing matches the user's skills: which of their skills align with each role, how well each job fits their profile, and any gaps (e.g. "Both roles match your Python and data analysis skills; Job 1 emphasizes ML while Job 2 focuses on business analytics. Job 1 aligns better with your experience...").
- Output "listingMatchScores" for each listing: an array of objects with listingId, matchScore (0-100), matchedSkills (skills from the user's list that the job requires or clearly values), and missingSkills (skills the job requires that the user does not have). Compare each job description to the user's skills and compute the score. Include experience-related gaps in missingSkills when the job requires more years than the user has. For each listing ID in ${JSON.stringify(listingIds)}, add exactly one entry to listingMatchScores.`
      : "";
  const prompt = `You are a job comparison assistant for the Singapore job market. Compare the following ${listings.length} job listings and produce a unified comparison that summarizes similarities and differences.

${blocks.join("\n\n")}

Rules:
- Write a single "summary" paragraph that synthesizes the comparison: what the roles have in common and how they differ (e.g. seniority, focus, salary, location, requirements).${skillsMatchRules}
- Provide "similarities": an array of 3–6 short points describing what is similar across these listings (e.g. all require X, all mention Y, similar industry).
- Provide "differences": an array of 3–6 short points describing key differences (e.g. seniority level, salary range, remote vs on-site, different tech stacks).
- Optionally list 3–6 "comparisonPoints" (additional comparison points if needed).
- Use the job order (Job 1, Job 2, Job 3) – the IDs are: ${listingIds.join(", ")}. recommendedListingId must be one of: ${listingIds.join(", ")}.${candidateContext}
- Address the user in second-person ("you", "your") in all text fields — never "the candidate".
- Output must match the schema exactly.`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGemini((model) =>
        generateObject({ model, schema: ComparisonSummarySchema, prompt }),
      ),
    { fallbackMessage: "Comparison generation failed. Please try again." },
  );
  return object as ComparisonSummary;
}

export interface ComparisonStreamResult {
  partialObjectStream: AsyncIterable<Partial<ComparisonSummary>>;
  object: Promise<ComparisonSummary>;
}

/** Streams a unified comparison for 2–3 listings using Gemini via streamObject. Same prompt as generateComparisonSummary; returns partial stream and final object promise. */
export async function generateComparisonSummaryStream(
  listingIds: string[],
  options?: ComparisonSummaryOptions,
): Promise<ComparisonStreamResult> {
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
Your context (use this to recommend which job is the better fit for you):
- Skills: ${userSkills.length > 0 ? userSkills.join(", ") : "Not provided"}
${currentRole != null && currentRole.trim() !== "" ? `- Current or target role: ${currentRole.trim()}` : ""}
${yearsOfExperience != null ? `- Years of experience: ${yearsOfExperience}` : ""}

Given your skills and experience, which listing is the better fit for you? Set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation based on your skills and experience.`
    : `
If one listing is clearly a better fit for a typical applicant, set "recommendedListingId" to that job's ID and "recommendationReason" to a short explanation.`;
  const skillsMatchRules =
    userSkills.length > 0
      ? `
- The "summary" paragraph MUST include how each listing matches the user's skills: which of their skills align with each role, how well each job fits their profile, and any gaps (e.g. "Both roles match your Python and data analysis skills; Job 1 emphasizes ML while Job 2 focuses on business analytics. Job 1 aligns better with your experience...").
- Output "listingMatchScores" for each listing: an array of objects with listingId, matchScore (0-100), matchedSkills (skills from the user's list that the job requires or clearly values), and missingSkills (skills the job requires that the user does not have). Compare each job description to the user's skills and compute the score. Include experience-related gaps in missingSkills when the job requires more years than the user has. For each listing ID in ${JSON.stringify(listingIds)}, add exactly one entry to listingMatchScores.`
      : "";
  const prompt = `You are a job comparison assistant for the Singapore job market. Compare the following ${listings.length} job listings and produce a unified comparison that summarizes similarities and differences.

${blocks.join("\n\n")}

Rules:
- Write a single "summary" paragraph that synthesizes the comparison: what the roles have in common and how they differ (e.g. seniority, focus, salary, location, requirements).${skillsMatchRules}
- Provide "similarities": an array of 3–6 short points describing what is similar across these listings (e.g. all require X, all mention Y, similar industry).
- Provide "differences": an array of 3–6 short points describing key differences (e.g. seniority level, salary range, remote vs on-site, different tech stacks).
- Optionally list 3–6 "comparisonPoints" (additional comparison points if needed).
- Use the job order (Job 1, Job 2, Job 3) – the IDs are: ${listingIds.join(", ")}. recommendedListingId must be one of: ${listingIds.join(", ")}.${candidateContext}
- Address the user in second-person ("you", "your") in all text fields — never "the candidate".
- Output must match the schema exactly.`;

  return executeWithGemini((model) => {
    const result = streamObject({
      model,
      schema: ComparisonSummarySchema,
      prompt,
    });
    return Promise.resolve({
      partialObjectStream: result.partialObjectStream as AsyncIterable<
        Partial<ComparisonSummary>
      >,
      object: result.object as Promise<ComparisonSummary>,
    });
  });
}
