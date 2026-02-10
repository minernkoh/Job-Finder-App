/**
 * Resume service: parse resume text via Gemini into skills/job titles/summary, and upsert UserProfile. PDF and DOCX text extraction for file uploads.
 */

import { generateObject } from "ai";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { ResumeParseResultSchema, type ResumeParseResult } from "@schemas";
import { connectDB } from "@/lib/db";
import {
  executeWithGeminiFallback,
  retryWithBackoff,
} from "@/lib/ai/gemini";
import { isValidObjectId } from "@/lib/objectid";
import { UserProfile } from "@/lib/models/UserProfile";
import mongoose from "mongoose";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/** User-facing message when PDF text extraction fails (image-only or unsupported PDF). */
export const PDF_EXTRACT_ERROR_MESSAGE =
  "Could not extract text from this PDF. Try pasting the text manually or uploading a DOCX file.";

/** Extracts text from a PDF buffer. Rejects if over size limit or PDF invalid/empty. */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File must be 5MB or smaller");
  }
  try {
    const data = await pdf(buffer);
    const text = (data?.text ?? "").trim();
    if (!text) throw new Error(PDF_EXTRACT_ERROR_MESSAGE);
    return text;
  } catch (err) {
    if (err instanceof Error && err.message === "File must be 5MB or smaller")
      throw err;
    if (err instanceof Error && err.message === PDF_EXTRACT_ERROR_MESSAGE)
      throw err;
    throw new Error(PDF_EXTRACT_ERROR_MESSAGE);
  }
}

/** User-facing message when DOCX text extraction fails. */
export const DOCX_EXTRACT_ERROR_MESSAGE =
  "Could not extract text from this DOCX. Try pasting the text manually or use a different file.";

/** Extracts plain text from a DOCX buffer. Rejects if over size limit or DOCX invalid/empty. */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File must be 5MB or smaller");
  }
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result?.value ?? "").trim();
    if (!text) throw new Error(DOCX_EXTRACT_ERROR_MESSAGE);
    return text;
  } catch (err) {
    if (err instanceof Error && err.message === "File must be 5MB or smaller")
      throw err;
    if (err instanceof Error && err.message === DOCX_EXTRACT_ERROR_MESSAGE)
      throw err;
    throw new Error(DOCX_EXTRACT_ERROR_MESSAGE);
  }
}

/** Parses resume text into structured skills, job titles, summary, assessment, and suggested skills using Gemini with retries. */
export async function parseResumeWithRetry(text: string): Promise<ResumeParseResult> {
  const prompt = `You are a resume parser for the Singapore job market. Extract structured data from the following resume/CV text.

Rules:
- Extract "skills" as an array of strings: technical skills, tools, languages, soft skills mentioned (e.g. JavaScript, Python, project management, Agile). Normalize to clear, concise terms. Include at least 3 if present in the text.
- Extract "jobTitles" as an array of strings: job titles or roles the candidate has held or is targeting (e.g. Software Engineer, Product Manager).
- Optionally provide "resumeSummary": a short 1-2 sentence summary of the candidate's profile.
- Optionally provide "yearsOfExperience": the candidate's total (or relevant) years of professional experience as a whole number if inferable from dates or tenure; otherwise omit.
- Optionally provide "resumeAssessment": a short paragraph (2-4 sentences) assessing the resume: strengths, weaknesses, clarity, and 1-2 concrete suggestions for improvement (e.g. "Add quantifiable achievements", "Include relevant certifications").
- Optionally provide "suggestedSkills": an array of 2-6 skills the candidate could add to strengthen their profile (e.g. skills implied by their experience but not listed, or common for their target role). Do not duplicate skills already in "skills".
- Output must match the schema exactly. "skills" is required (use empty array if none found); other fields optional.

Resume text:
${text.slice(0, 30000)}`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGeminiFallback((model) =>
        generateObject({ model, schema: ResumeParseResultSchema, prompt }),
      ),
    { fallbackMessage: "Resume parsing failed. Please try again." }
  );
  return object as ResumeParseResult;
}

/** Upserts UserProfile for the given user; only updates fields that are present in data. Returns the profile. */
export async function upsertProfileForUser(
  userId: string,
  data: {
    skills?: string[];
    jobTitles?: string[];
    resumeSummary?: string;
    yearsOfExperience?: number | null;
  }
): Promise<{
  skills: string[];
  jobTitles?: string[];
  resumeSummary?: string;
  yearsOfExperience?: number;
}> {
  await connectDB();
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid user");
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.skills !== undefined) set.skills = data.skills;
  if (data.jobTitles !== undefined) set.jobTitles = data.jobTitles;
  if (data.resumeSummary !== undefined) set.resumeSummary = data.resumeSummary;
  if (data.yearsOfExperience !== undefined) set.yearsOfExperience = data.yearsOfExperience ?? undefined;
  const doc = await UserProfile.findOneAndUpdate(
    { userId: uid },
    { $set: set },
    { new: true, upsert: true }
  ).lean();
  return {
    skills: doc.skills ?? [],
    jobTitles: doc.jobTitles?.length ? doc.jobTitles : undefined,
    resumeSummary: doc.resumeSummary,
    yearsOfExperience: doc.yearsOfExperience,
  };
}

/** Returns the user's profile or null if none. */
export async function getProfileByUserId(
  userId: string
): Promise<{
  skills: string[];
  jobTitles?: string[];
  resumeSummary?: string;
  yearsOfExperience?: number;
} | null> {
  await connectDB();
  if (!isValidObjectId(userId)) return null;
  const doc = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  if (!doc) return null;
  return {
    skills: doc.skills ?? [],
    jobTitles: doc.jobTitles?.length ? doc.jobTitles : undefined,
    resumeSummary: doc.resumeSummary,
    yearsOfExperience: doc.yearsOfExperience,
  };
}
