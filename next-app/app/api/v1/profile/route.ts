/**
 * GET /api/v1/profile: return current user's profile (skills, jobTitles, resumeSummary). PUT: upsert profile. Requires auth.
 */

import { UserProfileUpdateSchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import {
  getProfileByUserId,
  upsertProfileForUser,
} from "@/lib/services/resume.service";

/** Returns the current user's profile or null if none. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  try {
    const profile = await getProfileByUserId(payload.sub);
    return NextResponse.json({
      success: true,
      data: profile ?? { skills: [], jobTitles: [], resumeSummary: undefined },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to get profile");
  }
}

/** Upserts the current user's profile with optional skills, jobTitles, resumeSummary. */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;

  try {
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
    };
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
