/**
 * Users list API: returns all users (admin only). Passwords are never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { serializeUser } from "@/lib/user-serializer";
import { withAdmin } from "@/lib/api/with-auth";

async function getUsersHandler(
  _request: NextRequest,
  _payload: { sub: string; email: string; role: "admin" | "user" }
): Promise<NextResponse> {
  const sql = getSql();
  const users = (await sql`
    select id, email, username, role, created_at, updated_at from users
  `) as unknown as Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  const data = users.map((u) => serializeUser(u));
  return NextResponse.json({ success: true, data });
}

export const GET = withAdmin(getUsersHandler, "Failed to list users");
