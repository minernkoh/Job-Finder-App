/**
 * Listings service: get-or-fetch pattern with MongoDB caching. Checks SearchCache by query hash, then Adzuna API if cache miss.
 */

import { createHash } from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { Listing, type IListingDocument } from "@/lib/models/Listing";
import { SearchCache } from "@/lib/models/SearchCache";
import type { ListingResult } from "@schemas";
import {
  fetchAdzunaSearch,
  validateCountry,
  type AdzunaCountry,
  type AdzunaJob,
} from "./adzuna.service";

const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LISTING_DETAIL_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours for individual listing

/** Filter options for job search; aligned with Adzuna API params. */
export interface ListingsFilters {
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
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
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
  };
}

/** Maps Adzuna job to our Listing document shape. */
function normalizeAdzunaJob(
  job: AdzunaJob,
  country: string,
  expiresAt: Date
): Omit<IListingDocument, "_id" | "createdAt" | "updatedAt"> {
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
    const listings = docs.map(docToListingResult);
    return { listings, totalCount: listings.length };
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
    { $set: { cacheKey, listingIds, expiresAt } },
    { upsert: true }
  );

  const listings: ListingResult[] = resp.results.map((job, i) =>
    jobToListingResult(job, String(listingIds[i]), cc)
  );

  return { listings, totalCount: resp.count };
}

/** Returns a single listing by id. Fetches from cache or Adzuna if needed. */
export async function getListingById(
  id: string
): Promise<ListingResult | null> {
  await connectDB();
  const objId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
  if (objId) {
    const doc = await Listing.findById(objId).lean();
    if (doc) return docToListingResult(doc);
  }
  return null;
}
