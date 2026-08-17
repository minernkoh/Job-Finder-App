/**
 * Resume service: parse resume text via Gemini into a master profile, and upsert UserProfile.
 * PDF and DOCX text extraction for file uploads.
 */

import { generateObject } from "ai";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import {
  ResumeParseResultSchema,
  type ResumeParseResult,
  type UserProfile,
  type UserProfileUpdate,
} from "@schemas";
import { connectDB } from "@/lib/db";
import {
  executeWithGemini,
  retryWithBackoff,
} from "@/lib/ai/gemini";
import { isValidObjectId } from "@/lib/objectid";
import { UserProfile as UserProfileModel } from "@/lib/models/UserProfile";
import mongoose from "mongoose";

/** Maximum file size (5 MB) for PDF and DOCX resume uploads. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

/** Parses resume text into a structured master profile using Gemini with retries. */
export async function parseResumeWithRetry(text: string): Promise<ResumeParseResult> {
  const prompt = `You are a resume parser for the Singapore job market. Extract a structured master profile from the following resume/CV text.

Rules — extract only facts present in the text. Never invent employers, titles, dates, metrics, or skills.
- "name": candidate's name.
- "headline": one-line professional headline if present.
- "contacts": email, phone, location, linkedin, website when present.
- "experience": array of { company, title, period (or start and end), bullets }. Keep original companies, titles, dates, and quantified metrics verbatim. Max 6 bullets per job, facts only.
- "projects": array of { name, description, bullets }.
- "education": array of { school, credential, period }.
- "honours": array of honour/award strings.
- "skillGroups": named groups of skills (e.g. Languages, Tools, Design) when the resume groups them; otherwise one group named "Skills".
- "skills": flat list of all skills (union of skillGroups). Required. Include at least 3 if present.
- "jobTitles": titles held or targeted.
- "resumeSummary": 1-2 sentence summary of the real background.
- "yearsOfExperience": whole years if inferable.
- "resumeAssessment": 2-4 sentences of feedback.
- "suggestedSkills": 2-6 skills they could add (not already in skills).
- Output must match the schema. Use empty arrays when a section is absent.

Resume text:
${text.slice(0, 30000)}`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGemini((model) =>
        generateObject({ model, schema: ResumeParseResultSchema, prompt }),
      ),
    { fallbackMessage: "Resume parsing failed. Please try again." }
  );
  return object as ResumeParseResult;
}

function leanToProfile(doc: {
  skills?: string[];
  jobTitles?: string[];
  resumeSummary?: string;
  yearsOfExperience?: number;
  name?: string;
  headline?: string;
  contacts?: UserProfile["contacts"];
  experience?: UserProfile["experience"];
  projects?: UserProfile["projects"];
  education?: UserProfile["education"];
  honours?: string[];
  skillGroups?: UserProfile["skillGroups"];
}): UserProfile {
  return {
    skills: doc.skills ?? [],
    jobTitles: doc.jobTitles?.length ? doc.jobTitles : undefined,
    resumeSummary: doc.resumeSummary,
    yearsOfExperience: doc.yearsOfExperience,
    name: doc.name,
    headline: doc.headline,
    contacts: doc.contacts,
    experience: doc.experience,
    projects: doc.projects,
    education: doc.education,
    honours: doc.honours,
    skillGroups: doc.skillGroups,
  };
}

/** Fields allowed on upsert; only present keys are written. */
export type ProfileUpsertData = UserProfileUpdate & {
  skills?: string[];
};

/** Upserts UserProfile for the given user; only updates fields that are present in data. Returns the profile. */
export async function upsertProfileForUser(
  userId: string,
  data: ProfileUpsertData
): Promise<UserProfile> {
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
  if (data.name !== undefined) set.name = data.name;
  if (data.headline !== undefined) set.headline = data.headline;
  if (data.contacts !== undefined) set.contacts = data.contacts;
  if (data.experience !== undefined) set.experience = data.experience;
  if (data.projects !== undefined) set.projects = data.projects;
  if (data.education !== undefined) set.education = data.education;
  if (data.honours !== undefined) set.honours = data.honours;
  if (data.skillGroups !== undefined) set.skillGroups = data.skillGroups;
  const doc = await UserProfileModel.findOneAndUpdate(
    { userId: uid },
    { $set: set },
    { new: true, upsert: true }
  ).lean();
  return leanToProfile(doc);
}

/** Returns the user's profile or null if none. */
export async function getProfileByUserId(
  userId: string
): Promise<UserProfile | null> {
  await connectDB();
  if (!isValidObjectId(userId)) return null;
  const doc = await UserProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  if (!doc) return null;
  return leanToProfile(doc);
}
