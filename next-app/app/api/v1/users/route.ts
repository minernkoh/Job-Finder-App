/**
 * Users list API: returns all users (admin only). Passwords are never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { getPayloadFromRequest } from "@/lib/auth/request";

/** Returns all users; requires admin role. */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayloadFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
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
    console.error("Get users error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to list users" },
      { status: 500 }
    );
  }
}
