/**
 * Listings service: get-or-fetch pattern with MongoDB caching. Checks SearchCache by query hash, then Adzuna API if cache miss.
 */

import { createHash, randomUUID } from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { parseObjectId } from "@/lib/objectid";
import { Listing, type IListingDocument } from "@/lib/models/Listing";
import { SearchCache } from "@/lib/models/SearchCache";
import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
import {
  fetchAdzunaSearch,
  validateCountry,
  type AdzunaCountry,
  type AdzunaJob,
} from "./adzuna.service";

/** Filter options for job search; aligned with Adzuna API params. */
export interface ListingsFilters {
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
}

/** Parses Adzuna created ISO string to Date; returns undefined if missing or invalid. */
function parsePostedAt(created: string | undefined): Date | undefined {
  if (!created?.trim()) return undefined;
  const d = new Date(created);
  return Number.isNaN(d.getTime()) ? undefined : d;
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

/** Maps a Listing document (lean) to API ListingResult shape. */
function docToListingResult(doc: {
  _id: unknown;
  title: string;
  company: string;
  location?: string;
  description?: string;
  sourceUrl?: string;
  country: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
}): ListingResult {
  return {
    id: String(doc._id),
    title: doc.title,
    company: doc.company,
    location: doc.location,
    description: doc.description,
    source: "adzuna",
    sourceUrl: doc.sourceUrl,
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
  return {
    id,
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name,
    description: job.description,
    source: "adzuna",
    sourceUrl: job.redirect_url,
    country,
    postedAt: parsePostedAt(job.created),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  };
}

/** Maps Adzuna job to our Listing document shape. */
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

/** Maps an Adzuna job to our Listing document shape. */
function normalizeAdzunaJob(
  job: AdzunaJob,
  country: string,
  expiresAt: Date
): Omit<IListingDocument, "_id" | "createdAt" | "updatedAt"> {
  const postedAt = parsePostedAt(job.created);
  return {
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? undefined,
    description: job.description ?? undefined,
    source: "adzuna",
    sourceUrl: job.redirect_url,
    sourceId: String(job.id),
    country,
    expiresAt,
    ...(postedAt && { postedAt }),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  };
}

/** Returns listings for a search. Uses cache first, then Adzuna. */
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

  // Check SearchCache
  const cached = await SearchCache.findOne({ cacheKey }).lean();
  if (cached && cached.expiresAt > new Date()) {
    const docs = await Listing.find({ _id: { $in: cached.listingIds } }).lean();
    const listings = sortListings(docs.map(docToListingResult), filters?.sortBy);
    const totalCount =
      typeof (cached as { totalCount?: number }).totalCount === "number"
        ? (cached as { totalCount: number }).totalCount
        : listings.length;
    return { listings, totalCount };
  }

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

  const listingIds: import("mongoose").Types.ObjectId[] = [];
  for (const job of resp.results) {
    const doc = normalizeAdzunaJob(job, cc, expiresAt);
    const upserted = await Listing.findOneAndUpdate(
      { sourceId: doc.sourceId, country: doc.country },
      { $set: doc },
      { upsert: true, new: true }
    );
    listingIds.push(upserted._id);
  }

  await SearchCache.findOneAndUpdate(
    { cacheKey },
    { $set: { cacheKey, listingIds, totalCount: resp.count, expiresAt } },
    { upsert: true }
  );

  const listings = sortListings(
    resp.results.map((job, i) =>
      jobToListingResult(job, String(listingIds[i]), cc)
    ),
    filters?.sortBy
  );

  return { listings, totalCount: resp.count };
}

/** Returns a single listing by id. Fetches from cache or Adzuna if needed. */
export async function getListingById(
  id: string
): Promise<ListingResult | null> {
  await connectDB();
  const objId = parseObjectId(id);
  if (objId) {
    const doc = await Listing.findById(objId).lean();
    if (doc) return docToListingResult(doc);
  }
  return null;
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
    source: "adzuna",
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
