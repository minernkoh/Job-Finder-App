/**
 * Users list API: returns all users (admin only). Passwords are never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import { serializeUser } from "@/lib/user-serializer";
import { withAdmin } from "@/lib/api/with-auth";

async function getUsersHandler(
  _request: NextRequest,
  _payload: { sub: string; email: string; role: "admin" | "user" }
): Promise<NextResponse> {
  const users = await User.find({}).select("-password").lean();
  const data = users.map((u) => serializeUser(u));
  return NextResponse.json({ success: true, data });
}

export const GET = withAdmin(getUsersHandler, "Failed to list users");
