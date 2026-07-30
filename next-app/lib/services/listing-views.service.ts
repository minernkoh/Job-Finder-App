/**
 * Listing views service: records view events and computes trending listings by recent view count.
 */

import { getSql } from "@/lib/db";
import { isValidObjectId } from "@/lib/objectid";

/** Records a view for a listing. Call when user clicks a listing or opens details. */
export async function recordView(listingId: string): Promise<void> {
  if (!isValidObjectId(listingId)) return;
  const sql = getSql();
  await sql`insert into listing_views (listing_id, viewed_at) values (${listingId}, now())`;
}

/** Returns top trending listing ids by view count in the given timeframe (hours). */
export async function getTrendingListingIds(
  limit: number,
  timeframeHours: number = 24
): Promise<string[]> {
  const sql = getSql();
  const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
  const rows = (await sql`
    select listing_id
    from listing_views
    where viewed_at >= ${since}
    group by listing_id
    order by count(*) desc
    limit ${limit}
  `) as unknown as Array<{ listingId: string }>;
  return rows.map((r) => r.listingId);
}
