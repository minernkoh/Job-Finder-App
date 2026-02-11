/**
 * API helpers for user profile: fetch, update, and parse resume. Used by My Jobs and jobs page for resume-based search.
 */

import type {
  ResumeParseResult,
  UserProfile,
  UserProfileUpdate,
} from "@schemas";
import { apiClient } from "./client";
import { assertApiSuccess, getErrorMessage } from "./errors";
import type { ApiResponse } from "./types";

export type { ResumeParseResult, UserProfile, UserProfileUpdate };

type ProfileData =
  | UserProfile
  | {
      skills: string[];
      jobTitles?: string[];
      resumeSummary?: string;
      yearsOfExperience?: number;
    };

/** Fetches the current user's profile. Returns profile with empty skills if none. */
export async function fetchProfile(): Promise<ProfileData> {
  const res = await apiClient.get<ApiResponse<ProfileData>>("/api/v1/profile");
  assertApiSuccess(res.data, "Failed to fetch profile");
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
  const res = await apiClient.put<ApiResponse<ProfileData>>(
    "/api/v1/profile",
    data
  );
  assertApiSuccess(res.data, "Failed to update profile");
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
    const res = await apiClient.post<ApiResponse<ResumeParseResult>>(
      "/api/v1/resume/parse",
      { text }
    );
    assertApiSuccess(res.data, "Failed to parse resume");
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
    const res = await apiClient.post<ApiResponse<ResumeParseResult>>(
      "/api/v1/resume/parse",
      formData
    );
    assertApiSuccess(res.data, "Failed to parse resume");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to parse resume"));
  }
}

/** Fetches AI-suggested skills for a given current role. Requires auth. */
export async function suggestSkills(
  currentRole: string
): Promise<{ skills: string[] }> {
  const res = await apiClient.post<ApiResponse<{ skills: string[] }>>(
    "/api/v1/profile/suggest-skills",
    { currentRole }
  );
  assertApiSuccess(res.data, "Failed to suggest skills");
  return res.data.data;
}
