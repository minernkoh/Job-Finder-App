/**
 * Current user API: returns the authenticated user's profile (id, email, username, role). Requires Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import { withAuth } from "@/lib/api/with-auth";
import { serializeUser } from "@/lib/user-serializer";

async function getMeHandler(
  _request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const user = await User.findById(payload.sub).lean();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    success: true,
    data: serializeUser(user, { timestamps: false }),
  });
}

/** Returns the current user from the access token. */
export const GET = withAuth(getMeHandler, "Failed to get user");
