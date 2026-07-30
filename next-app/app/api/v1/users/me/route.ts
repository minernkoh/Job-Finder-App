/**
 * Current user API: returns the authenticated user's profile (id, email, username, role). Requires Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidObjectId } from "@/lib/objectid";
import { withAuth } from "@/lib/api/with-auth";
import { serializeUser } from "@/lib/user-serializer";

async function getMeHandler(
  _request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const sql = getSql();
  const [user] = isValidObjectId(payload.sub)
    ? ((await sql`
        select id, email, username, role from users where id = ${payload.sub} limit 1
      `) as unknown as Array<{
        id: string;
        email: string;
        username: string;
        role: string;
      }>)
    : [];
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
