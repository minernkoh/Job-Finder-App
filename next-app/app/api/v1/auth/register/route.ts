/**
 * Register API: creates a new user, returns access token in JSON and sets refresh token in HttpOnly cookie.
 * Note: Returns { accessToken, user } (not wrapped in { success, data }) for compatibility with AuthContext.
 */

import { NextRequest, NextResponse } from "next/server";
import { UserCreateSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";

/** Creates user and returns access token plus user; sets refresh token cookie. Duplicate (email, user) returns 409. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");

    await connectDB();
    const existing = await User.findOne({ email: parsed.data.email, role: "user" }).lean();
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
    const usernameTrimmed = parsed.data.username.trim();
    const existingUsername = await User.findOne({ username: usernameTrimmed }).lean();
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username already taken", error: "Username already taken" },
        { status: 409 }
      );
    }

    const user = await User.create(parsed.data);
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
          email: user.email,
          role: user.role,
          username: user.username,
        },
      },
      { status: 201, headers }
    );
  } catch (err: unknown) {
    const message = "Registration failed";
    const errorDetail =
      process.env.NODE_ENV !== "production"
        ? (err instanceof Error ? err.message : String(err))
        : "Registration failed";
    return NextResponse.json(
      { success: false, message, error: errorDetail },
      { status: 500 }
    );
  }
}
