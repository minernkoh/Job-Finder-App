/**
 * User profile schema: parsed resume result (skills, job titles, summary) for matching and resume-based search.
 */

import { z } from "zod";

/** Result of parsing a resume (from AI or manual); used for API and storage. */
export const ResumeParseResultSchema = z.object({
  skills: z.array(z.string()),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
});

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;

/** User profile as stored and returned by GET/PUT /api/v1/profile; userId is server-set. */
export const UserProfileSchema = z.object({
  skills: z.array(z.string()),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/** PUT /api/v1/profile body: partial profile; all fields optional. */
export const UserProfileUpdateSchema = z.object({
  skills: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
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
