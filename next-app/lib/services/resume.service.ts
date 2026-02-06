/**
 * Resume service: parse resume text via Gemini into skills/job titles/summary, and upsert UserProfile. PDF and DOCX text extraction for file uploads.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { ResumeParseResultSchema, type ResumeParseResult } from "@schemas";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { UserProfile } from "@/lib/models/UserProfile";
import mongoose from "mongoose";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function getGeminiModel() {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error("AI summarization is not configured");
  }
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

/** Extracts text from a PDF buffer. Rejects if over size limit or PDF invalid/empty. */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File must be 5MB or smaller");
  }
  try {
    const data = await pdf(buffer);
    const text = (data?.text ?? "").trim();
    if (!text) throw new Error("Could not extract text from PDF");
    return text;
  } catch (err) {
    if (err instanceof Error && err.message === "File must be 5MB or smaller")
      throw err;
    throw new Error("Could not extract text from PDF");
  }
}

/** Extracts plain text from a DOCX buffer. Rejects if over size limit or DOCX invalid/empty. */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File must be 5MB or smaller");
  }
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result?.value ?? "").trim();
    if (!text) throw new Error("Could not extract text from DOCX");
    return text;
  } catch (err) {
    if (err instanceof Error && err.message === "File must be 5MB or smaller")
      throw err;
    throw new Error("Could not extract text from DOCX");
  }
}

/** Parses resume text into structured skills, job titles, and optional summary using Gemini with retries. */
export async function parseResumeWithRetry(text: string): Promise<ResumeParseResult> {
  const model = getGeminiModel();
  const prompt = `You are a resume parser for the Singapore job market. Extract structured data from the following resume/CV text.

Rules:
- Extract "skills" as an array of strings: technical skills, tools, languages, soft skills mentioned (e.g. JavaScript, Python, project management, Agile). Normalize to clear, concise terms. Include at least 3 if present in the text.
- Extract "jobTitles" as an array of strings: job titles or roles the candidate has held or is targeting (e.g. Software Engineer, Product Manager).
- Optionally provide "resumeSummary": a short 1-2 sentence summary of the candidate's profile.
- Output must match the schema exactly. "skills" is required (use empty array if none found); other fields optional.

Resume text:
${text.slice(0, 30000)}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: ResumeParseResultSchema,
        prompt,
      });
      return object as ResumeParseResult;
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
    : new Error("Resume parsing failed. Please try again.");
}

/** Upserts UserProfile for the given user with parsed result; returns the profile. */
export async function upsertProfileForUser(
  userId: string,
  data: { skills: string[]; jobTitles?: string[]; resumeSummary?: string }
): Promise<{ skills: string[]; jobTitles?: string[]; resumeSummary?: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user");
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const doc = await UserProfile.findOneAndUpdate(
    { userId: uid },
    {
      $set: {
        skills: data.skills ?? [],
        jobTitles: data.jobTitles ?? [],
        resumeSummary: data.resumeSummary,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  ).lean();
  return {
    skills: doc.skills ?? [],
    jobTitles: doc.jobTitles?.length ? doc.jobTitles : undefined,
    resumeSummary: doc.resumeSummary,
  };
}

/** Returns the user's profile or null if none. */
export async function getProfileByUserId(
  userId: string
): Promise<{ skills: string[]; jobTitles?: string[]; resumeSummary?: string } | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const doc = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  if (!doc) return null;
  return {
    skills: doc.skills ?? [],
    jobTitles: doc.jobTitles?.length ? doc.jobTitles : undefined,
    resumeSummary: doc.resumeSummary,
  };
}
