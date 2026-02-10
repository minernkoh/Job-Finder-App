/**
 * API helpers for user profile: fetch, update, and parse resume. Used by My Jobs and jobs page for resume-based search.
 */

import type {
  ResumeParseResult,
  UserProfile,
  UserProfileUpdate,
} from "@schemas";
import { apiClient } from "./client";
import { getErrorMessage } from "./errors";

export type { ResumeParseResult, UserProfile, UserProfileUpdate };

export interface ProfileResponse {
  success: boolean;
  data:
    | UserProfile
    | { skills: string[]; jobTitles?: string[]; resumeSummary?: string; yearsOfExperience?: number };
}

export interface ParseResumeResponse {
  success: boolean;
  data: ResumeParseResult;
}

/** Fetches the current user's profile. Returns profile with empty skills if none. */
export async function fetchProfile(): Promise<
  | UserProfile
  | { skills: string[]; jobTitles?: string[]; resumeSummary?: string; yearsOfExperience?: number }
> {
  const res = await apiClient.get<ProfileResponse>("/api/v1/profile");
  if (!res.data.success || res.data.data === undefined)
    throw new Error("Failed to fetch profile");
  return res.data.data;
}

/** Updates the current user's profile with partial data. */
export async function updateProfile(
  data: UserProfileUpdate
): Promise<{
  skills: string[];
  jobTitles?: string[];
  resumeSummary?: string;
  yearsOfExperience?: number;
}> {
  const res = await apiClient.put<ProfileResponse>("/api/v1/profile", data);
  if (!res.data.success || res.data.data === undefined)
    throw new Error(
      (res.data as { message?: string }).message ?? "Failed to update profile"
    );
  return res.data.data as {
    skills: string[];
    jobTitles?: string[];
    resumeSummary?: string;
    yearsOfExperience?: number;
  };
}

/** Parses resume text and saves result to profile. Returns parsed result. */
export async function parseResume(text: string): Promise<ResumeParseResult> {
  try {
    const res = await apiClient.post<ParseResumeResponse>(
      "/api/v1/resume/parse",
      { text }
    );
    if (!res.data.success || !res.data.data)
      throw new Error(
        (res.data as { message?: string }).message ?? "Failed to parse resume"
      );
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to parse resume"));
  }
}

/** Parses resume from an uploaded PDF or DOCX file and saves result to profile. Returns parsed result. */
export async function parseResumeFile(file: File): Promise<ResumeParseResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ParseResumeResponse>(
      "/api/v1/resume/parse",
      formData
    );
    if (!res.data.success || !res.data.data)
      throw new Error(
        (res.data as { message?: string }).message ?? "Failed to parse resume"
      );
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to parse resume"));
  }
}

export interface SuggestSkillsResponse {
  success: boolean;
  data: { skills: string[] };
}

/** Fetches AI-suggested skills for a given current role. Requires auth. */
export async function suggestSkills(
  currentRole: string
): Promise<{ skills: string[] }> {
  const res = await apiClient.post<SuggestSkillsResponse>(
    "/api/v1/profile/suggest-skills",
    { currentRole }
  );
  if (!res.data.success || res.data.data === undefined)
    throw new Error(
      (res.data as { message?: string }).message ?? "Failed to suggest skills"
    );
  return res.data.data;
}
