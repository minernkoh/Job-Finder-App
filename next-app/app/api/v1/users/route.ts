/**
 * Users list API: returns all users (admin only). Passwords are never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { toErrorResponse } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/guard";

/** Returns all users; requires admin role. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const users = await User.find({}).select("-password").lean();
    const data = users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list users");
  }
}
