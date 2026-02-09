/**
 * Admin register API: creates a new user with role admin when adminSecret matches env. Returns access token in JSON and sets refresh token in HttpOnly cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminRegisterSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";

/** Creates admin user when adminSecret is valid; returns access token and sets refresh cookie. Duplicate (email, admin) returns 409; invalid or missing secret returns 403. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AdminRegisterSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");

    const secret = process.env.ADMIN_REGISTER_SECRET;
    if (!secret || secret.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin registration is not configured",
          error: "Admin registration is not configured",
        },
        { status: 403 }
      );
    }
    const { adminSecret, ...createData } = parsed.data;
    if (adminSecret !== secret) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid admin secret",
          error: "Invalid admin secret",
        },
        { status: 403 }
      );
    }

    await connectDB();
    const existing = await User.findOne({ email: createData.email, role: "admin" }).lean();
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already registered",
          error: "Email already registered",
        },
        { status: 409 }
      );
    }
    const usernameTrimmed = (createData as { username?: string }).username?.trim();
    if (usernameTrimmed) {
      const existingUsername = await User.findOne({ username: usernameTrimmed }).lean();
      if (existingUsername) {
        return NextResponse.json(
          { success: false, message: "Username already taken", error: "Username already taken" },
          { status: 409 }
        );
      }
    }

    const user = await User.create({ ...createData, role: "admin" });
    const sub = user._id.toString();

    const accessToken = await signAccessToken({
      sub,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await signRefreshToken({ sub });

    const headers = new Headers();
    headers.set("Set-Cookie", buildSetCookieHeader(refreshToken));

    return NextResponse.json(
      {
        accessToken,
        user: {
          id: sub,
          name: user.name,
          email: user.email,
          role: user.role,
          username: (user as { username?: string }).username,
        },
      },
      { status: 201, headers }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Admin registration failed",
        error: "Admin registration failed",
      },
      { status: 500 }
    );
  }
}
