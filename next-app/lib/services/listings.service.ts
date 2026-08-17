/**
 * Listings service: get-or-fetch pattern with MongoDB caching. Checks SearchCache by query hash, then Adzuna API if cache miss.
 */

import { createHash, randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { parseObjectId } from "@/lib/objectid";
import { Listing, type IListingDocument } from "@/lib/models/Listing";
import { SearchCache } from "@/lib/models/SearchCache";
import type { ListingCreate, ListingResult, ListingSource, ListingUpdate } from "@schemas";
import type { ListingsFilters } from "@/lib/query-keys";
import {
  fetchAdzunaSearch,
  validateCountry,
  type AdzunaCountry,
  type AdzunaJob,
} from "./adzuna.service";
import {
  fetchMcfJobByUuid,
  searchMcfJobs,
} from "./mycareersfuture.service";

/** Escapes special regex characters in a string so it can be safely used in RegExp. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    country.toLowerCase() === "sg" ? "sources=adzuna,mcf" : "sources=adzuna",
  ].join("&");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function listingSourceOf(doc: {
  source?: string;
  sourceId?: string;
}): ListingSource {
  if (doc.sourceId?.startsWith("manual-")) return "manual";
  if (doc.source === "mcf" || doc.source === "manual" || doc.source === "adzuna") {
    return doc.source;
  }
  return "adzuna";
}

/** Maps a Listing document (lean) to API ListingResult shape. */
function docToListingResult(doc: {
  _id: unknown;
  title: string;
  company: string;
  location?: string;
  description?: string;
  source?: string;
  sourceUrl?: string;
  sourceId?: string;
  country: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
}): ListingResult {
  const source = listingSourceOf(doc);
  const sourceUrl =
    doc.sourceUrl ??
    (doc.sourceId && source === "adzuna"
      ? buildAdzunaJobUrl(doc.sourceId, doc.country)
      : undefined);
  return {
    id: String(doc._id),
    title: doc.title,
    company: doc.company,
    location: doc.location,
    description: doc.description,
    source,
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

function listingDedupeKey(l: { title: string; company: string }): string {
  return `${l.title.trim().toLowerCase()}|${l.company.trim().toLowerCase()}`;
}

/** Prefer MCF when the same title+company appears from two sources. */
function preferMcfOnDuplicate(listings: ListingResult[]): ListingResult[] {
  const seen = new Map<string, ListingResult>();
  const order: string[] = [];
  for (const l of listings) {
    const key = listingDedupeKey(l);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, l);
      order.push(key);
      continue;
    }
    if (l.source === "mcf" && existing.source !== "mcf") {
      seen.set(key, l);
    }
  }
  return order.map((k) => seen.get(k)!);
}

/** Maps an MCF search card to a Listing document shape. */
function normalizeMcfJob(
  job: {
    sourceId: string;
    title: string;
    company: string;
    location: string;
    sourceUrl?: string;
    postedAt?: Date;
    salaryMin?: number;
    salaryMax?: number;
    description?: string;
  },
  expiresAt: Date
): Omit<IListingDocument, "_id" | "createdAt" | "updatedAt"> {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    source: "mcf",
    sourceUrl: job.sourceUrl,
    sourceId: job.sourceId,
    country: "sg",
    expiresAt,
    ...(job.postedAt && { postedAt: job.postedAt }),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
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

/** Fetches manual listings from MongoDB that match search criteria. Only runs for page 1. */
async function fetchManualListings(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters
): Promise<ListingResult[]> {
  if (page !== 1) return [];

  const query: Record<string, unknown> = {
    sourceId: { $regex: /^manual-/ },
    country,
    expiresAt: { $gt: new Date() },
  };

  const andConditions: Record<string, unknown>[] = [];

  if (keyword?.trim()) {
    const regex = new RegExp(escapeRegex(keyword.trim()), "i");
    andConditions.push({
      $or: [
        { title: regex },
        { company: regex },
        { description: regex },
      ],
    });
  }

  if (filters?.where?.trim()) {
    andConditions.push({
      location: { $regex: escapeRegex(filters.where.trim()), $options: "i" },
    });
  }

  if (filters?.salaryMin != null && filters.salaryMin > 0) {
    andConditions.push({
      $or: [
        { salaryMin: { $gte: filters.salaryMin } },
        { salaryMax: { $gte: filters.salaryMin } },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  const docs = await Listing.find(query).lean();
  return docs.map((d) => docToListingResult(d));
}

/** Maps an Adzuna job to our Listing document shape. */
function normalizeAdzunaJob(
  job: AdzunaJob,
  country: string,
  expiresAt: Date
): Omit<IListingDocument, "_id" | "createdAt" | "updatedAt"> {
  const postedAt = parsePostedAt(job.created);
  const sourceUrl =
    job.redirect_url ?? buildAdzunaJobUrl(String(job.id), country);
  return {
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? undefined,
    description: job.description ?? undefined,
    source: "adzuna",
    sourceUrl,
    sourceId: String(job.id),
    country,
    expiresAt,
    ...(postedAt && { postedAt }),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  };
}

/** Returns listings for a search. Uses cache first, then Adzuna. Merges manual listings on page 1. */
export async function searchListings(
  country: string,
  page: number,
  keyword?: string,
  filters?: ListingsFilters
): Promise<{ listings: ListingResult[]; totalCount: number }> {
  await connectDB();
  const env = getEnv();
  const cc = validateCountry(country) as AdzunaCountry;
  const cacheKey = buildCacheKey(cc, page, keyword, filters);

  let listings: ListingResult[];
  let totalCount: number;

  // Check SearchCache
  const cached = await SearchCache.findOne({ cacheKey }).lean();
  if (cached && cached.expiresAt > new Date()) {
    const docs = await Listing.find({ _id: { $in: cached.listingIds } }).lean();
    listings = sortListings(
      preferMcfOnDuplicate(docs.map(docToListingResult)),
      filters?.sortBy,
    );
    totalCount =
      typeof (cached as { totalCount?: number }).totalCount === "number"
        ? (cached as { totalCount: number }).totalCount
        : listings.length;
  } else {
    const ttlMs = (env.JOB_SEARCH_CACHE_TTL ?? 3600) * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const listingIds: import("mongoose").Types.ObjectId[] = [];
    const mapped: ListingResult[] = [];
    let adzunaCount = 0;

    const hasAdzuna = Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
    if (!hasAdzuna && cc !== "sg") {
      throw new Error(
        "ADZUNA_APP_ID and ADZUNA_APP_KEY must be set for job search",
      );
    }

    if (hasAdzuna) {
      const resp = await fetchAdzunaSearch(
        env.ADZUNA_APP_ID!,
        env.ADZUNA_APP_KEY!,
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
        },
      );
      adzunaCount = resp.count;
      for (const job of resp.results) {
        const doc = normalizeAdzunaJob(job, cc, expiresAt);
        const upserted = await Listing.findOneAndUpdate(
          { sourceId: doc.sourceId, country: doc.country },
          { $set: doc },
          { upsert: true, new: true },
        );
        listingIds.push(upserted._id);
        mapped.push(jobToListingResult(job, String(upserted._id), cc));
      }
    }

    if (cc === "sg") {
      const mcfJobs = await searchMcfJobs(keyword ?? "", page, 20);
      for (const job of mcfJobs) {
        const doc = normalizeMcfJob(job, expiresAt);
        const upserted = await Listing.findOneAndUpdate(
          { sourceId: doc.sourceId, country: doc.country },
          { $set: doc },
          { upsert: true, new: true },
        );
        listingIds.push(upserted._id);
        mapped.push(docToListingResult(upserted.toObject()));
      }
    }

    await SearchCache.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          cacheKey,
          listingIds,
          totalCount: Math.max(adzunaCount, mapped.length),
          expiresAt,
        },
      },
      { upsert: true },
    );

    listings = sortListings(preferMcfOnDuplicate(mapped), filters?.sortBy);
    totalCount = Math.max(adzunaCount, listings.length);
  }

  // Merge manual listings on page 1
  if (page === 1) {
    const manual = await fetchManualListings(cc, page, keyword, filters);
    const existingIds = new Set(listings.map((l) => l.id));
    const manualFiltered = manual.filter((m) => !existingIds.has(m.id));
    listings = sortListings(
      preferMcfOnDuplicate([...manualFiltered, ...listings]),
      filters?.sortBy
    );
    totalCount += manualFiltered.length;
  }

  return { listings, totalCount };
}

/** Returns a single listing by id. Fetches from cache or Adzuna if needed. */
export async function getListingById(
  id: string
): Promise<ListingResult | null> {
  await connectDB();
  const objId = parseObjectId(id);
  if (!objId) return null;
  const doc = await Listing.findById(objId);
  if (!doc) return null;

  if (doc.source === "mcf") {
    const desc = (doc.description ?? "").trim();
    if (desc.length < 200) {
      const uuidMatch = doc.sourceUrl?.match(/\/job\/([^/?#]+)/i);
      const uuid = uuidMatch?.[1] ?? doc.sourceId;
      const hydrated = await fetchMcfJobByUuid(uuid);
      if (hydrated?.description) {
        doc.description = hydrated.description;
        if (hydrated.sourceUrl) doc.sourceUrl = hydrated.sourceUrl;
        await doc.save();
      }
    }
  }

  return docToListingResult(doc.toObject());
}

/** Returns listings for the given ids, in order; skips missing ids. */
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
  await connectDB();
  const docs = await Listing.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
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
  await connectDB();
  const sourceId = `manual-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const doc = await Listing.create({
    title: body.title,
    company: body.company,
    location: body.location,
    description: body.description,
    country: body.country ?? "sg",
    sourceUrl: body.sourceUrl,
    source: "manual",
    sourceId,
    expiresAt,
  });
  const lean = doc.toObject();
  return docToListingResult(lean);
}

/** Updates a listing by id (admin). Returns updated listing or null if not found. */
export async function updateListingById(
  id: string,
  body: ListingUpdate
): Promise<ListingResult | null> {
  await connectDB();
  const objId = parseObjectId(id);
  if (!objId) return null;
  const doc = await Listing.findById(objId);
  if (!doc) return null;
  if (body.title !== undefined) doc.title = body.title;
  if (body.company !== undefined) doc.company = body.company;
  if (body.location !== undefined) doc.location = body.location;
  if (body.description !== undefined) doc.description = body.description;
  if (body.country !== undefined) doc.country = body.country;
  if (body.sourceUrl !== undefined) doc.sourceUrl = body.sourceUrl ?? undefined;
  await doc.save();
  return docToListingResult(doc.toObject());
}

/** Deletes a listing by id (admin). Returns true if deleted, false if not found. */
export async function deleteListingById(id: string): Promise<boolean> {
  await connectDB();
  const objId = parseObjectId(id);
  if (!objId) return false;
  const result = await Listing.findByIdAndDelete(objId);
  return result != null;
}
