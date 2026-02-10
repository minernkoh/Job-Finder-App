/**
 * Current user API: returns the authenticated user's profile (id, email, username, role). Requires Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { toErrorResponse } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/request";

/** Returns the current user from the access token. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const payload = auth;

    await connectDB();
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        username: user.username,
      },
    });
  } catch (e) {
    return toErrorResponse(e, "Failed to get user");
  }
}
