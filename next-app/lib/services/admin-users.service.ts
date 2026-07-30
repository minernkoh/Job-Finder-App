/**
 * Admin users service: list users with filters/pagination, get user detail with activity counts, create user, update email/username, update role/status, delete user with safeguards.
 */

import { getSql } from "@/lib/db";
import { calculatePagination } from "@/lib/pagination";
import { isValidObjectId } from "@/lib/objectid";
import { hashPassword } from "@/lib/auth/password";
import type { UserRole } from "@schemas";
import type { UserStatus } from "@schemas";
import type { AdminCreateUserBody } from "@schemas";
import type { AdminUpdateUserBody } from "@schemas";

/** Escapes ILIKE wildcards so user input is matched literally. */
function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface ListUsersResult {
  users: Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of users with optional search (username/email) and filters (role, status). */
export async function listUsers(
  params: ListUsersParams,
): Promise<ListUsersResult> {
  const sql = getSql();
  const { page, limit, skip } = calculatePagination(params);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conds: any[] = [];
  if (params.role) conds.push(sql`role = ${params.role}`);
  if (params.status) conds.push(sql`status = ${params.status}`);
  if (params.search?.trim()) {
    const p = likeContains(params.search.trim());
    conds.push(sql`(username ilike ${p} or email ilike ${p})`);
  }
  let where = sql``;
  if (conds.length > 0) {
    let combined = conds[0];
    for (let i = 1; i < conds.length; i++) combined = sql`${combined} and ${conds[i]}`;
    where = sql`where ${combined}`;
  }

  const [users, countRows] = await Promise.all([
    sql`
      select id, email, username, role, status, created_at, updated_at
      from users
      ${where}
      order by created_at desc
      limit ${limit} offset ${skip}
    ` as unknown as Promise<
      Array<{
        id: string;
        email: string;
        username: string;
        role: string;
        status?: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >,
    sql`select count(*)::int as count from users ${where}` as unknown as Promise<
      Array<{ count: number }>
    >,
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      status: u.status ?? "active",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    total: countRows[0].count,
    page,
    limit,
  };
}

export interface UserDetailResult {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  summaryCount: number;
  savedCount: number;
  lastSummaryAt?: Date;
  lastSavedAt?: Date;
}

/** User by id with summary count, saved count, and last activity timestamps. */
export async function getUserDetail(
  userId: string,
): Promise<UserDetailResult | null> {
  if (!isValidObjectId(userId)) return null;
  const sql = getSql();

  const [user] = (await sql`
    select id, email, username, role, status, created_at, updated_at
    from users where id = ${userId}
  `) as unknown as Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  if (!user) return null;

  const [counts] = (await sql`
    select
      (select count(*)::int from ai_summaries where user_id = ${userId}) as summary_count,
      (select count(*)::int from saved_listings where user_id = ${userId}) as saved_count,
      (select max(created_at) from ai_summaries where user_id = ${userId}) as last_summary_at,
      (select max(created_at) from saved_listings where user_id = ${userId}) as last_saved_at
  `) as unknown as Array<{
    summaryCount: number;
    savedCount: number;
    lastSummaryAt?: Date;
    lastSavedAt?: Date;
  }>;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status ?? "active",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    summaryCount: counts.summaryCount,
    savedCount: counts.savedCount,
    lastSummaryAt: counts.lastSummaryAt ?? undefined,
    lastSavedAt: counts.lastSavedAt ?? undefined,
  };
}

/** Count admins (for last-admin safeguard). */
export async function countAdmins(): Promise<number> {
  const sql = getSql();
  const [row] = (await sql`
    select count(*)::int as count from users where role = 'admin'
  `) as unknown as Array<{ count: number }>;
  return row.count;
}

/** Create a new user (admin-only). Password is hashed here. Returns new user or duplicate email/username reason. */
export async function createUser(
  body: AdminCreateUserBody,
): Promise<
  | {
      success: true;
      user: { id: string; email: string; username: string; role: string };
    }
  | { success: false; reason: string }
> {
  const sql = getSql();
  const targetRole = body.role ?? "user";

  const [existing] = (await sql`
    select 1 from users where email = ${body.email} and role = ${targetRole} limit 1
  `) as unknown as unknown[];
  if (existing) {
    return { success: false, reason: "Email already registered for this role" };
  }
  const usernameTrimmed = body.username.trim();
  const [existingUsername] = (await sql`
    select 1 from users where username = ${usernameTrimmed} limit 1
  `) as unknown as unknown[];
  if (existingUsername) {
    return { success: false, reason: "Username already taken" };
  }

  const password = await hashPassword(body.password);
  const [user] = (await sql`
    insert into users (email, username, password, role)
    values (${body.email}, ${usernameTrimmed}, ${password}, ${targetRole})
    returning id, email, username, role
  `) as unknown as Array<{
    id: string;
    email: string;
    username: string;
    role: string;
  }>;
  return {
    success: true,
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  };
}

/** Update user email and/or username (admin-only). */
export async function updateUserProfile(
  userId: string,
  body: AdminUpdateUserBody,
): Promise<{ success: false; reason: string } | { success: true }> {
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }
  const sql = getSql();
  const [user] = (await sql`
    select id, role from users where id = ${userId}
  `) as unknown as Array<{ id: string; role: string }>;
  if (!user) return { success: false, reason: "User not found" };

  const update: Record<string, unknown> = {};
  if (body.email != null) {
    const [existing] = (await sql`
      select 1 from users where email = ${body.email} and role = ${user.role} and id <> ${userId} limit 1
    `) as unknown as unknown[];
    if (existing)
      return { success: false, reason: "Email already in use for this role" };
    update.email = body.email;
  }
  if (body.username !== undefined) {
    const trimmed = body.username.trim();
    if (!trimmed) {
      return {
        success: false,
        reason: "Username is required and cannot be cleared",
      };
    }
    const [existingUsername] = (await sql`
      select 1 from users where username = ${trimmed} and id <> ${userId} limit 1
    `) as unknown as unknown[];
    if (existingUsername)
      return { success: false, reason: "Username already taken" };
    update.username = trimmed;
  }

  if (Object.keys(update).length > 0) {
    await sql`update users set ${sql(update)} where id = ${userId}`;
  }
  return { success: true };
}

/** Update user role; throws if demoting last admin. */
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ success: false; reason: string } | { success: true }> {
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }
  const sql = getSql();

  const [user] = (await sql`
    select id, role from users where id = ${userId}
  `) as unknown as Array<{ id: string; role: string }>;
  if (!user) return { success: false, reason: "User not found" };

  if (user.role === "admin" && role === "user") {
    if ((await countAdmins()) <= 1) {
      return { success: false, reason: "Cannot demote the last admin" };
    }
  }

  await sql`update users set role = ${role} where id = ${userId}`;
  return { success: true };
}

/** Update user status (active/suspended). */
export async function updateUserStatus(
  userId: string,
  status: UserStatus,
): Promise<{ success: false; reason: string } | { success: true }> {
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }
  const sql = getSql();

  const rows = (await sql`
    update users set status = ${status} where id = ${userId} returning id
  `) as unknown as Array<{ id: string }>;
  if (rows.length === 0) return { success: false, reason: "User not found" };
  return { success: true };
}

/** Delete user; allows self-delete. Rejects if last admin. Related rows cascade via FK. */
export async function deleteUser(
  userId: string,
): Promise<{ success: false; reason: string } | { success: true }> {
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }
  const sql = getSql();

  const [user] = (await sql`
    select id, role from users where id = ${userId}
  `) as unknown as Array<{ id: string; role: string }>;
  if (!user) return { success: false, reason: "User not found" };
  if (user.role === "admin") {
    if ((await countAdmins()) <= 1) {
      return { success: false, reason: "Cannot delete the last admin" };
    }
  }

  // ai_summaries, saved_listings, user_profiles, comparison_summaries all have
  // ON DELETE CASCADE foreign keys to users, so deleting the user removes them too.
  await sql`delete from users where id = ${userId}`;
  return { success: true };
}
