/**
 * Listings service: get-or-fetch pattern with Postgres caching. Checks search_cache by query hash, then Adzuna API if cache miss.
 */

import { createHash, randomUUID } from "crypto";
import { getSql, compact } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { isValidObjectId } from "@/lib/objectid";
import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
import type { ListingsFilters } from "@/lib/query-keys";
import {
  fetchAdzunaSearch,
  validateCountry,
  type AdzunaCountry,
  type AdzunaJob,
} from "./adzuna.service";

/** A listing row as stored in Postgres (camelCase via the db client's transform). */
interface ListingRow {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  source: string;
  sourceUrl?: string;
  sourceId: string;
  country: string;
  expiresAt: Date;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Escapes ILIKE wildcards so user input is matched literally (backslash is the default escape char). */
function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Parses Adzuna created ISO string to Date; returns undefined if missing or invalid. */
function parsePostedAt(created: string | undefined): Date | undefined {
  if (!created?.trim()) return undefined;
  const d = new Date(created);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Adzuna country code to job page base domain. Used to build fallback URL when redirect_url is missing. */
const ADZUNA_DOMAINS: Record<string, string> = {
  gb: "adzuna.co.uk",
  at: "adzuna.at",
  au: "adzuna.com.au",
  be: "adzuna.be",
  br: "adzuna.com.br",
  ca: "adzuna.ca",
  ch: "adzuna.ch",
  de: "adzuna.de",
  es: "adzuna.es",
  fr: "adzuna.fr",
  in: "adzuna.in",
  it: "adzuna.it",
  mx: "adzuna.com.mx",
  nl: "adzuna.nl",
  nz: "adzuna.co.nz",
  pl: "adzuna.pl",
  ru: "adzuna.ru",
  sg: "adzuna.sg",
  us: "adzuna.com",
  za: "adzuna.co.za",
};

/** Builds Adzuna job page URL when redirect_url is missing. Uses sourceId and country. */
function buildAdzunaJobUrl(sourceId: string, country: string): string {
  const domain = ADZUNA_DOMAINS[country?.toLowerCase() ?? "sg"] ?? "adzuna.com";
  return `https://www.${domain}/jobs/land/ad/${encodeURIComponent(sourceId)}`;
}

/** Builds cache key from search params for deduplication. */
function buildCacheKey(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters
): string {
  const f = filters ?? {};
  const raw = [
    `country=${country}`,
    `page=${page}`,
    `what=${keyword ?? ""}`,
    `where=${f.where ?? ""}`,
    `category=${f.category ?? ""}`,
    `fullTime=${f.fullTime ?? false}`,
    `permanent=${f.permanent ?? false}`,
    `salaryMin=${f.salaryMin ?? ""}`,
    `sortBy=${f.sortBy ?? ""}`,
  ].join("&");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/** Maps a listing row to API ListingResult shape. */
function docToListingResult(doc: {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  sourceUrl?: string;
  sourceId?: string;
  country: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
}): ListingResult {
  const sourceUrl =
    doc.sourceUrl ??
    (doc.sourceId && !doc.sourceId.startsWith("manual-")
      ? buildAdzunaJobUrl(doc.sourceId, doc.country)
      : undefined);
  return {
    id: doc.id,
    title: doc.title,
    company: doc.company,
    location: doc.location,
    description: doc.description,
    source: "adzuna",
    sourceUrl,
    country: doc.country,
    postedAt: doc.postedAt,
    salaryMin: doc.salaryMin,
    salaryMax: doc.salaryMax,
  };
}

/** Maps an Adzuna job plus id and country to API ListingResult shape. */
function jobToListingResult(
  job: AdzunaJob,
  id: string,
  country: string
): ListingResult {
  const sourceUrl =
    job.redirect_url ?? buildAdzunaJobUrl(String(job.id), country);
  return {
    id,
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name,
    description: job.description,
    source: "adzuna",
    sourceUrl,
    country,
    postedAt: parsePostedAt(job.created),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  };
}

/** Sorts listings by the given sort option. Returns original order if sortBy is empty or unknown. */
function sortListings(listings: ListingResult[], sortBy?: string): ListingResult[] {
  if (!sortBy || listings.length <= 1) return listings;
  const copy = [...listings];
  switch (sortBy) {
    case "salary_desc":
      return copy.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
    case "salary_asc":
      return copy.sort((a, b) => (a.salaryMin ?? a.salaryMax ?? 0) - (b.salaryMin ?? b.salaryMax ?? 0));
    case "date_desc":
      return copy.sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0));
    case "date_asc":
      return copy.sort((a, b) => (a.postedAt?.getTime() ?? 0) - (b.postedAt?.getTime() ?? 0));
    default:
      return copy;
  }
}

/** Fetches manual listings from Postgres that match search criteria. Only runs for page 1. */
async function fetchManualListings(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters
): Promise<ListingResult[]> {
  if (page !== 1) return [];
  const sql = getSql();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conds: any[] = [
    sql`source_id like 'manual-%'`,
    sql`country = ${country}`,
    sql`expires_at > now()`,
  ];

  if (keyword?.trim()) {
    const p = likeContains(keyword.trim());
    conds.push(sql`(title ilike ${p} or company ilike ${p} or description ilike ${p})`);
  }
  if (filters?.where?.trim()) {
    conds.push(sql`location ilike ${likeContains(filters.where.trim())}`);
  }
  if (filters?.salaryMin != null && filters.salaryMin > 0) {
    conds.push(sql`(salary_min >= ${filters.salaryMin} or salary_max >= ${filters.salaryMin})`);
  }

  let where = conds[0];
  for (let i = 1; i < conds.length; i++) where = sql`${where} and ${conds[i]}`;

  const docs = (await sql`select * from listings where ${where}`) as unknown as ListingRow[];
  return docs.map((d) => docToListingResult(d));
}

/** Maps an Adzuna job to our listing column shape (camelCase keys -> snake_case columns). */
function normalizeAdzunaJob(
  job: AdzunaJob,
  country: string,
  expiresAt: Date
): Record<string, unknown> {
  const postedAt = parsePostedAt(job.created);
  const sourceUrl =
    job.redirect_url ?? buildAdzunaJobUrl(String(job.id), country);
  return compact({
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? undefined,
    description: job.description ?? undefined,
    source: "adzuna",
    sourceUrl,
    sourceId: String(job.id),
    country,
    expiresAt,
    postedAt,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  });
}

/** Returns listings for a search. Uses cache first, then Adzuna. Merges manual listings on page 1. */
export async function searchListings(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters
): Promise<{ listings: ListingResult[]; totalCount: number }> {
  const sql = getSql();
  const env = getEnv();
  const cc = validateCountry(country) as AdzunaCountry;
  const cacheKey = buildCacheKey(cc, page, keyword, filters);

  let listings: ListingResult[];
  let totalCount: number;

  // Check search_cache
  const [cached] = (await sql`
    select listing_ids, total_count, expires_at
    from search_cache
    where cache_key = ${cacheKey}
  `) as unknown as Array<{ listingIds: string[]; totalCount: number; expiresAt: Date }>;

  if (cached && cached.expiresAt > new Date()) {
    const ids = cached.listingIds;
    const docs =
      ids.length > 0
        ? ((await sql`
            select * from listings
            where id = any(${ids}::uuid[])
            order by array_position(${ids}::uuid[], id)
          `) as unknown as ListingRow[])
        : [];
    listings = sortListings(docs.map(docToListingResult), filters?.sortBy);
    totalCount =
      typeof cached.totalCount === "number" ? cached.totalCount : listings.length;
  } else {
    // Cache miss: fetch from Adzuna
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      throw new Error(
        "ADZUNA_APP_ID and ADZUNA_APP_KEY must be set for job search"
      );
    }
    const ttlMs = (env.JOB_SEARCH_CACHE_TTL ?? 3600) * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const resp = await fetchAdzunaSearch(
      env.ADZUNA_APP_ID,
      env.ADZUNA_APP_KEY,
      cc,
      page,
      {
        what: keyword,
        resultsPerPage: 20,
        where: filters?.where,
        category: filters?.category,
        fullTime: filters?.fullTime,
        permanent: filters?.permanent,
        salaryMin: filters?.salaryMin,
        sortBy: filters?.sortBy,
      }
    );

    const listingIds: string[] = [];
    for (const job of resp.results) {
      const doc = normalizeAdzunaJob(job, cc, expiresAt);
      const [row] = (await sql`
        insert into listings ${sql(doc)}
        on conflict (source_id, country) do update set ${sql(doc)}
        returning id
      `) as unknown as Array<{ id: string }>;
      listingIds.push(row.id);
    }

    await sql`
      insert into search_cache (cache_key, listing_ids, total_count, expires_at)
      values (${cacheKey}, ${listingIds}::uuid[], ${resp.count}, ${expiresAt})
      on conflict (cache_key) do update set
        listing_ids = excluded.listing_ids,
        total_count = excluded.total_count,
        expires_at = excluded.expires_at,
        updated_at = now()
    `;

    listings = sortListings(
      resp.results.map((job, i) =>
        jobToListingResult(job, listingIds[i], cc)
      ),
      filters?.sortBy
    );
    totalCount = resp.count;
  }

  // Merge manual listings on page 1
  if (page === 1) {
    const manual = await fetchManualListings(cc, page, keyword, filters);
    const existingIds = new Set(listings.map((l) => l.id));
    const manualFiltered = manual.filter((m) => !existingIds.has(m.id));
    listings = sortListings(
      [...manualFiltered, ...listings],
      filters?.sortBy
    );
    totalCount += manualFiltered.length;
  }

  return { listings, totalCount };
}

/** Returns a single listing by id. */
export async function getListingById(
  id: string
): Promise<ListingResult | null> {
  if (!isValidObjectId(id)) return null;
  const sql = getSql();
  const [doc] = (await sql`select * from listings where id = ${id}`) as unknown as ListingRow[];
  return doc ? docToListingResult(doc) : null;
}

/** Returns the listings for the given ids, in order; skips missing ids. */
export async function getListingsByIds(
  ids: string[]
): Promise<ListingResult[]> {
  const results = await Promise.all(ids.map((id) => getListingById(id)));
  return results.filter((r): r is ListingResult => r != null);
}

/** Returns the most recent listings by createdAt, for fallback when no trending views exist. */
export async function getRecentListings(
  limit: number
): Promise<ListingResult[]> {
  const sql = getSql();
  const docs = (await sql`
    select * from listings order by created_at desc limit ${limit}
  `) as unknown as ListingRow[];
  return docs.map((d) => docToListingResult(d));
}

/** Fetches listings from search (Adzuna + manual) to fill a gap. Excludes already-present ids. Used by trending when view-based results are sparse. */
export async function getListingsToFill(
  country: string,
  limit: number,
  excludeIds: Set<string>
): Promise<ListingResult[]> {
  const { listings } = await searchListings(country, 1);
  const filtered = listings.filter((l) => !excludeIds.has(l.id));
  return filtered.slice(0, limit);
}

/** Creates a manual listing (admin). Sets sourceId and expiresAt server-side. */
export async function createListing(
  body: ListingCreate
): Promise<ListingResult> {
  const sql = getSql();
  const sourceId = `manual-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const doc = compact({
    title: body.title,
    company: body.company,
    location: body.location,
    description: body.description,
    country: body.country ?? "sg",
    sourceUrl: body.sourceUrl,
    source: "adzuna",
    sourceId,
    expiresAt,
  });
  const [row] = (await sql`
    insert into listings ${sql(doc)} returning *
  `) as unknown as ListingRow[];
  return docToListingResult(row);
}

/** Updates a listing by id (admin). Returns updated listing or null if not found. */
export async function updateListingById(
  id: string,
  body: ListingUpdate
): Promise<ListingResult | null> {
  if (!isValidObjectId(id)) return null;
  const sql = getSql();

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.company !== undefined) update.company = body.company;
  if (body.location !== undefined) update.location = body.location;
  if (body.description !== undefined) update.description = body.description;
  if (body.country !== undefined) update.country = body.country;
  if (body.sourceUrl !== undefined) update.sourceUrl = body.sourceUrl ?? null;

  if (Object.keys(update).length === 0) {
    return getListingById(id);
  }

  const [row] = (await sql`
    update listings set ${sql(update)} where id = ${id} returning *
  `) as unknown as ListingRow[];
  return row ? docToListingResult(row) : null;
}

/** Deletes a listing by id (admin). Returns true if deleted, false if not found. */
export async function deleteListingById(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  const sql = getSql();
  const rows = (await sql`
    delete from listings where id = ${id} returning id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}
