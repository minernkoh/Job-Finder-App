/**
 * Register API: creates a new user, returns access token in JSON and sets refresh token in HttpOnly cookie.
 * Note: Returns { accessToken, user } (not wrapped in { success, data }) for compatibility with AuthContext.
 */

import { NextRequest, NextResponse } from "next/server";
import { UserCreateSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";
import { serializeUser } from "@/lib/user-serializer";

/** Creates user and returns access token plus user; sets refresh token cookie. Duplicate (email, user) returns 409. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");

    const sql = getSql();
    const [existing] = (await sql`
      select 1 from users where email = ${parsed.data.email} and role = 'user' limit 1
    `) as unknown as unknown[];
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
    const [existingUsername] = (await sql`
      select 1 from users where username = ${usernameTrimmed} limit 1
    `) as unknown as unknown[];
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username already taken", error: "Username already taken" },
        { status: 409 }
      );
    }

    const password = await hashPassword(parsed.data.password);
    const [user] = (await sql`
      insert into users (email, username, password, role)
      values (${parsed.data.email}, ${usernameTrimmed}, ${password}, 'user')
      returning id, email, username, role
    `) as unknown as Array<{ id: string; email: string; username: string; role: "user" | "admin" }>;
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
