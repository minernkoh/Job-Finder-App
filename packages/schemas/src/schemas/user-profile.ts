/**
 * User profile schema: parsed resume result and editable master profile used for matching and JD tailoring.
 */

import { z } from "zod";

/** Whole years of professional experience; optional, cap 0–70 for validation. */
const YearsOfExperienceSchema = z.number().int().min(0).max(70);

export const ProfileContactSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});
export type ProfileContact = z.infer<typeof ProfileContactSchema>;

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  period: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;

export const ProjectEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  url: z.string().optional(),
});
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;

export const EducationEntrySchema = z.object({
  school: z.string().min(1),
  credential: z.string().optional(),
  period: z.string().optional(),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const SkillGroupSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string()).default([]),
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

/** Shared structured-profile fields used by parse results and stored profile. */
const MasterProfileFields = {
  name: z.string().optional(),
  headline: z.string().optional(),
  contacts: ProfileContactSchema.optional(),
  experience: z.array(ExperienceEntrySchema).optional(),
  projects: z.array(ProjectEntrySchema).optional(),
  education: z.array(EducationEntrySchema).optional(),
  honours: z.array(z.string()).optional(),
  skillGroups: z.array(SkillGroupSchema).optional(),
};

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
  ...MasterProfileFields,
});

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;

/** User profile as stored and returned by GET/PUT /api/v1/profile; userId is server-set. */
export const UserProfileSchema = z.object({
  skills: z.array(z.string()),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
  /** Whole years of professional experience; optional. */
  yearsOfExperience: YearsOfExperienceSchema.optional(),
  ...MasterProfileFields,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/** PUT /api/v1/profile body: partial profile; all fields optional. Use null to clear yearsOfExperience. */
export const UserProfileUpdateSchema = z.object({
  skills: z.array(z.string()).optional(),
  jobTitles: z.array(z.string()).optional(),
  resumeSummary: z.string().optional(),
  yearsOfExperience: YearsOfExperienceSchema.nullable().optional(),
  name: z.string().optional(),
  headline: z.string().optional(),
  contacts: ProfileContactSchema.optional(),
  experience: z.array(ExperienceEntrySchema).optional(),
  projects: z.array(ProjectEntrySchema).optional(),
  education: z.array(EducationEntrySchema).optional(),
  honours: z.array(z.string()).optional(),
  skillGroups: z.array(SkillGroupSchema).optional(),
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
