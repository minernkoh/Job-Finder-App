/**
 * Admin listings service: paginated list of cached listings for admin view.
 */

import { getSql } from "@/lib/db";
import { calculatePagination } from "@/lib/pagination";

export interface ListListingsParams {
  page?: number;
  limit?: number;
}

export interface ListListingsResult {
  listings: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    country: string;
    sourceId: string;
    expiresAt: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of listings (cached jobs). */
export async function listListings(
  params: ListListingsParams
): Promise<ListListingsResult> {
  const sql = getSql();
  const { page, limit, skip } = calculatePagination(params);

  const [listings, countRows] = await Promise.all([
    sql`
      select id, title, company, location, country, source_id, expires_at, created_at
      from listings
      order by created_at desc
      limit ${limit} offset ${skip}
    ` as unknown as Promise<
      Array<{
        id: string;
        title: string;
        company: string;
        location?: string;
        country: string;
        sourceId: string;
        expiresAt: Date;
        createdAt: Date;
      }>
    >,
    sql`select count(*)::int as count from listings` as unknown as Promise<
      Array<{ count: number }>
    >,
  ]);

  return {
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      company: l.company,
      location: l.location,
      country: l.country,
      sourceId: l.sourceId,
      expiresAt: l.expiresAt.toISOString(),
      createdAt: l.createdAt.toISOString(),
    })),
    total: countRows[0].count,
    page,
    limit,
  };
}
