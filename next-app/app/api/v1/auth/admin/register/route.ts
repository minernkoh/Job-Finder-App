/**
 * Admin register API: creates a new user with role admin when adminSecret matches env. Returns access token in JSON and sets refresh token in HttpOnly cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { AdminRegisterSchema } from "@schemas";
import { validationErrorResponse } from "@/lib/api/errors";
import { getSql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { buildSetCookieHeader } from "@/lib/auth/cookies";
import { serializeUser } from "@/lib/user-serializer";

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

    const sql = getSql();
    const [existing] = (await sql`
      select 1 from users where email = ${createData.email} and role = 'admin' limit 1
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
    const usernameTrimmed = createData.username.trim();
    const [existingUsername] = (await sql`
      select 1 from users where username = ${usernameTrimmed} limit 1
    `) as unknown as unknown[];
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username already taken", error: "Username already taken" },
        { status: 409 }
      );
    }

    const password = await hashPassword(createData.password);
    const [user] = (await sql`
      insert into users (email, username, password, role)
      values (${createData.email}, ${usernameTrimmed}, ${password}, 'admin')
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
