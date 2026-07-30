/**
 * Login API: validates login (email or username) and password, returns access token in JSON and sets refresh token in HttpOnly cookie.
 * Note: Returns { accessToken, user } (not wrapped in { success, data }) so the frontend AuthContext can use res.data.accessToken and res.data.user without change.
 */

import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { getSql } from "@/lib/db";
import { comparePassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";
import { serializeUser } from "@/lib/user-serializer";

interface LoginUserRow {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  status?: string;
  password: string;
}

/** Validates credentials and returns access token plus user; sets refresh token cookie. Resolves user by email (if login contains @) or username. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const { login, password, role } = parsed.data;
    const loginRole = role ?? "user";

    const sql = getSql();
    const isEmail = login.includes("@");
    const [user] = (isEmail
      ? ((await sql`
          select id, email, username, role, status, password
          from users where email = ${login} and role = ${loginRole} limit 1
        `) as unknown as LoginUserRow[])
      : ((await sql`
          select id, email, username, role, status, password
          from users where username = ${login} and role = ${loginRole} limit 1
        `) as unknown as LoginUserRow[]));
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
    if (user.status === "suspended") {
      return NextResponse.json(
        { success: false, message: "Account suspended" },
        { status: 403 }
      );
    }

    const sub = user.id;
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
        user: serializeUser(user, { timestamps: false }),
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
