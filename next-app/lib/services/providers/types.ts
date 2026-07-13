/**
 * Provider abstraction for job sources. Each source (Adzuna, MCF, LinkedIn, JobStreet)
 * implements JobProvider so searchListings can fan out and merge. Best-effort providers
 * must resolve to [] on any failure — search() never throws.
 */

import type { ListingSource } from "@schemas";
import type { Env } from "@/lib/env";
import type { ListingsFilters } from "@/lib/types/listings";

/** A normalized job from any provider, before it becomes a Listing document or ListingResult. */
export interface NormalizedJob {
  source: ListingSource;
  sourceId: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  sourceUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt?: Date;
}

/** Result of a provider search: the jobs plus a total count for pagination (defaults to jobs.length). */
export interface ProviderResult {
  jobs: NormalizedJob[];
  totalCount: number;
}

/** Everything a provider needs to run one search. */
export interface SearchContext {
  keyword?: string;
  /** 1-based page. Only Adzuna paginates past page 1; SG scrapers only serve page 1. */
  page: number;
  /** Validated lowercase country code (e.g. "sg", "gb"). */
  country: string;
  filters?: ListingsFilters;
  env: Env;
}

export interface JobProvider {
  /** Source tag stamped onto every job this provider returns. */
  readonly source: ListingSource;
  /** Whether this provider covers the given (lowercase) country code. */
  supportsCountry(cc: string): boolean;
  /** Whether this provider is usable given current env (keys present, flags on). */
  enabled(env: Env): boolean;
  /** Fetch jobs. Best-effort providers must never throw — resolve to { jobs: [], totalCount: 0 }. */
  search(ctx: SearchContext): Promise<ProviderResult>;
}
