/**
 * User profile schema: parsed resume result (skills, job titles, summary) for matching and resume-based search.
 */

import { z } from "zod";

/** Whole years of professional experience; optional, cap 0–70 for validation. */
const YearsOfExperienceSchema = z.number().int().min(0).max(70);

/** Result of parsing a resume (from AI or manual); used for API and storage. */
export const ResumeParseResultSchema = z.object({
  skills: z.array(z.string()),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
  /** Total or relevant years of professional experience if inferable from resume. */
  yearsOfExperience: YearsOfExperienceSchema.optional(),
  /** Short AI assessment: strengths, weaknesses, clarity, suggested improvements. */
  resumeAssessment: z.string().optional(),
  /** Skills the AI suggests adding to strengthen the profile (e.g. inferred from resume or common for the role). */
  suggestedSkills: z.array(z.string()).optional(),
});

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;

/** User profile as stored and returned by GET/PUT /api/v1/profile; userId is server-set. */
export const UserProfileSchema = z.object({
  skills: z.array(z.string()),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
  /** Whole years of professional experience; optional. */
  yearsOfExperience: YearsOfExperienceSchema.optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/** PUT /api/v1/profile body: partial profile; all fields optional. Use null to clear yearsOfExperience. */
export const UserProfileUpdateSchema = z.object({
  skills: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
  yearsOfExperience: YearsOfExperienceSchema.nullable().optional(),
});

export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

/** POST /api/v1/resume/parse body: raw resume text. */
export const ParseResumeBodySchema = z.object({
  text: z.string().min(1, "Resume text is required"),
});

export type ParseResumeBody = z.infer<typeof ParseResumeBodySchema>;

/** POST /api/v1/profile/suggest-skills body: current role for AI skill suggestions. */
export const SuggestSkillsBodySchema = z.object({
  currentRole: z.string().min(1, "Current role is required"),
});

export type SuggestSkillsBody = z.infer<typeof SuggestSkillsBodySchema>;

/** POST /api/v1/profile/suggest-skills response: suggested skills array. */
export const SuggestSkillsResponseSchema = z.object({
  skills: z.array(z.string()),
});

export type SuggestSkillsResponse = z.infer<typeof SuggestSkillsResponseSchema>;
