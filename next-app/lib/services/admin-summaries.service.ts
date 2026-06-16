/**
 * Admin summaries service: list all summaries with optional user filter and pagination; delete summary by id.
 */

import { getSql } from "@/lib/db";
import { calculatePagination } from "@/lib/pagination";
import { isValidObjectId, parseObjectId } from "@/lib/objectid";

export interface ListSummariesParams {
  userId?: string;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "-createdAt";
}

export interface ListSummariesResult {
  summaries: Array<{
    id: string;
    userId: string;
    userName: string;
    tldr: string;
    createdAt: Date;
    hasSalarySgd: boolean;
    hasJdMatch: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of AI summaries; optional filter by userId. */
export async function listSummaries(
  params: ListSummariesParams
): Promise<ListSummariesResult> {
  const sql = getSql();
  const { page, limit, skip } = calculatePagination(params);
  const desc = params.sort === "-createdAt";

  const userId = parseObjectId(params.userId?.trim());
  const where = userId ? sql`where s.user_id = ${userId}` : sql``;
  const order = desc ? sql`desc` : sql`asc`;

  const [summaries, countRows] = await Promise.all([
    sql`
      select s.id, s.user_id, coalesce(u.username, '') as user_name, s.tldr, s.created_at,
             (s.salary_sgd is not null) as has_salary_sgd,
             (s.jd_match is not null) as has_jd_match
      from ai_summaries s
      left join users u on u.id = s.user_id
      ${where}
      order by s.created_at ${order}
      limit ${limit} offset ${skip}
    ` as unknown as Promise<
      Array<{
        id: string;
        userId: string;
        userName: string;
        tldr: string;
        createdAt: Date;
        hasSalarySgd: boolean;
        hasJdMatch: boolean;
      }>
    >,
    sql`select count(*)::int as count from ai_summaries s ${where}` as unknown as Promise<
      Array<{ count: number }>
    >,
  ]);

  return {
    summaries: summaries.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.userName,
      tldr: s.tldr,
      createdAt: s.createdAt,
      hasSalarySgd: s.hasSalarySgd,
      hasJdMatch: s.hasJdMatch,
    })),
    total: countRows[0].count,
    page,
    limit,
  };
}

/** Deletes a summary by id; returns true if deleted, false if not found. */
export async function deleteSummary(summaryId: string): Promise<boolean> {
  if (!isValidObjectId(summaryId)) return false;
  const sql = getSql();
  const rows = (await sql`
    delete from ai_summaries where id = ${summaryId} returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}
