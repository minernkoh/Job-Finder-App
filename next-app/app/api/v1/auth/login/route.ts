/**
 * Login API: validates login (email or username) and password, returns access token in JSON and sets refresh token in HttpOnly cookie.
 * Note: Returns { accessToken, user } (not wrapped in { success, data }) so the frontend AuthContext can use res.data.accessToken and res.data.user without change.
 */

import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { User, comparePassword } from "@/lib/models/User";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";

/** Validates credentials and returns access token plus user; sets refresh token cookie. Resolves user by email (if login contains @) or username. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const { login, password, role } = parsed.data;
    const loginRole = role ?? "user";

    await connectDB();
    const isEmail = login.includes("@");
    const user = isEmail
      ? await User.findOne({ email: login, role: loginRole }).select("+password").lean()
      : await User.findOne({ username: login }).select("+password").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email, username, or password" },
        { status: 401 }
      );
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Invalid email, username, or password" },
        { status: 401 }
      );
    }
    if ((user as { status?: string }).status === "suspended") {
      return NextResponse.json(
        { success: false, message: "Account suspended" },
        { status: 403 }
      );
    }

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
      { headers }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Login failed" },
      { status: 500 }
    );
  }
}
