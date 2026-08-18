/**
 * Tailored resume schemas: Gemini rewrite of a master profile against one job description.
 */

import { z } from "zod";
import {
  EducationEntrySchema,
  ExperienceEntrySchema,
  ProfileContactSchema,
  ProjectEntrySchema,
  SkillGroupSchema,
  UserProfileSchema,
} from "./user-profile";

export const TailorResumeBodySchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
  forceRegenerate: z.boolean().optional(),
});
export type TailorResumeBody = z.infer<typeof TailorResumeBodySchema>;

/** POST /api/v1/demo/resume/tailor: listing plus the browser-only preview profile. */
export const DemoTailorBodySchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
  forceRegenerate: z.boolean().optional(),
  profile: UserProfileSchema,
});
export type DemoTailorBody = z.infer<typeof DemoTailorBodySchema>;

/** Subset Gemini is allowed to rewrite. Name, contacts, projects, education stay from the master profile. */
export const TailorLlmResultSchema = z.object({
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  skillsOrder: z.array(z.string()).optional(),
  matchScore: z.number().int().min(0).max(100),
  gaps: z.array(z.string()),
  coverLetter: z.string(),
});
export type TailorLlmResult = z.infer<typeof TailorLlmResultSchema>;

export const TailoredResumeContentSchema = z.object({
  name: z.string(),
  headline: z.string().optional(),
  contacts: ProfileContactSchema.optional(),
  summary: z.string(),
  experience: z.array(ExperienceEntrySchema),
  skillGroups: z.array(SkillGroupSchema),
  projects: z.array(ProjectEntrySchema).optional(),
  education: z.array(EducationEntrySchema).optional(),
  honours: z.array(z.string()).optional(),
  matchScore: z.number().int().min(0).max(100),
  gaps: z.array(z.string()),
  coverLetter: z.string(),
  warnings: z.array(z.string()),
});
export type TailoredResumeContent = z.infer<typeof TailoredResumeContentSchema>;

export const TailoredResumeResultSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingTitle: z.string().optional(),
  listingCompany: z.string().optional(),
  content: TailoredResumeContentSchema,
  createdAt: z.coerce.date().optional(),
});
export type TailoredResumeResult = z.infer<typeof TailoredResumeResultSchema>;
