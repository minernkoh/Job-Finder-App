/**
 * Users list API: returns all users (admin only). Passwords are never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { toErrorResponse } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/request";

/** Returns all users; requires admin role. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const payload = auth;
    if (payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDB();
    const users = await User.find({}).select("-password").lean();
    const data = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list users");
  }
}
