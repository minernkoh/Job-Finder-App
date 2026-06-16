/**
 * Saved listings service: save/unsave listings for a user, and fetch user's saved listings.
 */

import type { SavedListingResult, SaveListingBody } from "@schemas";
import { getSql, compact } from "@/lib/db";
import { isValidObjectId } from "@/lib/objectid";

/** A saved_listing row (camelCase via the db client's transform). */
interface SavedListingRow {
  id: string;
  listingId: string;
  title: string;
  company: string;
  location?: string;
  sourceUrl?: string;
  country?: string;
  createdAt: Date;
}

/** Maps a saved_listing row to API SavedListingResult shape. */
function docToSavedListingResult(doc: SavedListingRow): SavedListingResult {
  return {
    id: doc.id,
    listingId: doc.listingId,
    title: doc.title,
    company: doc.company,
    location: doc.location,
    sourceUrl: doc.sourceUrl,
    country: doc.country,
    savedAt: doc.createdAt.toISOString(),
  };
}

/** Saves a listing for a user. Idempotent. */
export async function saveListing(
  userId: string,
  input: SaveListingBody
): Promise<SavedListingResult> {
  const sql = getSql();
  const doc = compact({
    userId,
    listingId: input.listingId,
    title: input.title,
    company: input.company,
    location: input.location,
    sourceUrl: input.sourceUrl,
    country: input.country,
  });
  const update = compact({
    title: input.title,
    company: input.company,
    location: input.location,
    sourceUrl: input.sourceUrl,
    country: input.country,
  });
  const [row] = (await sql`
    insert into saved_listings ${sql(doc)}
    on conflict (user_id, listing_id) do update set ${sql(update)}
    returning *
  `) as unknown as SavedListingRow[];
  return docToSavedListingResult(row);
}

/** Unsaves a listing for a user. */
export async function unsaveListing(
  userId: string,
  listingId: string
): Promise<boolean> {
  if (!isValidObjectId(listingId)) return false;
  const sql = getSql();
  const rows = (await sql`
    delete from saved_listings
    where user_id = ${userId} and listing_id = ${listingId}
    returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

/** Returns whether the user has saved the listing. */
export async function isListingSaved(
  userId: string,
  listingId: string
): Promise<boolean> {
  if (!isValidObjectId(listingId)) return false;
  const sql = getSql();
  const rows = (await sql`
    select 1 from saved_listings
    where user_id = ${userId} and listing_id = ${listingId}
    limit 1
  `) as unknown as unknown[];
  return rows.length > 0;
}

/** Returns all saved listings for a user. */
export async function getSavedListings(
  userId: string
): Promise<SavedListingResult[]> {
  const sql = getSql();
  const docs = (await sql`
    select * from saved_listings
    where user_id = ${userId}
    order by created_at desc
  `) as unknown as SavedListingRow[];
  return docs.map(docToSavedListingResult);
}
