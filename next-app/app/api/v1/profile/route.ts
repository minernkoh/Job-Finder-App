/**
 * GET /api/v1/profile: return current user's profile (skills, jobTitles, resumeSummary). PUT: upsert profile. Requires auth.
 */

import { UserProfileUpdateSchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import {
  getProfileByUserId,
  upsertProfileForUser,
} from "@/lib/services/resume.service";

async function getProfileHandler(
  _request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const profile = await getProfileByUserId(payload.sub);
  return NextResponse.json({
    success: true,
    data: profile ?? { skills: [], jobTitles: [], resumeSummary: undefined, yearsOfExperience: undefined },
  });
}

async function putProfileHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const body = await request.json();
  const parsed = UserProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  const data = parsed.data;
  const existing = await getProfileByUserId(payload.sub);
  const merged = {
    skills: data.skills ?? existing?.skills ?? [],
    jobTitles: data.jobTitles ?? existing?.jobTitles ?? [],
    resumeSummary:
      data.resumeSummary !== undefined
        ? data.resumeSummary
        : existing?.resumeSummary,
    yearsOfExperience:
      data.yearsOfExperience !== undefined ? data.yearsOfExperience : existing?.yearsOfExperience,
  };
  try {
    const profile = await upsertProfileForUser(payload.sub, merged);
    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    if (message === "Invalid user") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    return toErrorResponse(err, "Failed to update profile");
  }
}

export const GET = withAuth(getProfileHandler, "Failed to get profile");
export const PUT = withAuth(putProfileHandler, "Failed to update profile");
