/**
 * Refresh API: reads refresh token from HttpOnly cookie, issues new access and refresh tokens, sets new cookie.
 * Note: Returns { accessToken } (not wrapped in { success, data }) so the frontend can use res.data.accessToken.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isValidObjectId } from "@/lib/objectid";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import {
  getRefreshTokenFromCookie,
  buildSetCookieHeader,
} from "@/lib/auth/cookies";

/** Rotates tokens using refresh cookie; returns new access token and sets new refresh cookie. */
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const refreshToken = getRefreshTokenFromCookie(cookieHeader);
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "Missing refresh token" },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    const sql = getSql();
    const [user] = isValidObjectId(payload.sub)
      ? ((await sql`
          select id, email, role from users where id = ${payload.sub} limit 1
        `) as unknown as Array<{ id: string; email: string; role: "user" | "admin" }>)
      : [];
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 401 }
      );
    }

    const sub = user.id;
    const newAccessToken = await signAccessToken({
      sub,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = await signRefreshToken({ sub });

    const headers = new Headers();
    headers.set("Set-Cookie", buildSetCookieHeader(newRefreshToken));

    return NextResponse.json({ accessToken: newAccessToken }, { headers });
  } catch {
    return NextResponse.json(
      { success: false, message: "Refresh failed" },
      { status: 500 }
    );
  }
}
