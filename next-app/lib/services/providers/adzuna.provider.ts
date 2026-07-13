/**
 * Adzuna provider — wraps the existing Adzuna client (adzuna.service.ts) behind JobProvider.
 * Supports every Adzuna country; enabled only when both API keys are present. Owns the
 * Adzuna-specific URL-fallback and posted-date helpers (moved here from listings.service).
 */

import type { Env } from "@/lib/env";
import { SUPPORTED_COUNTRIES } from "@/lib/constants/countries";
import {
  fetchAdzunaSearch,
  type AdzunaCountry,
  type AdzunaJob,
} from "../adzuna.service";
import type {
  JobProvider,
  NormalizedJob,
  ProviderResult,
  SearchContext,
} from "./types";

/** Adzuna country code to job page base domain. Used to build a fallback URL when redirect_url is missing. */
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

/** Builds an Adzuna job page URL when redirect_url is missing. Uses sourceId and country. */
export function buildAdzunaJobUrl(sourceId: string, country: string): string {
  const domain = ADZUNA_DOMAINS[country?.toLowerCase() ?? "sg"] ?? "adzuna.com";
  return `https://www.${domain}/jobs/land/ad/${encodeURIComponent(sourceId)}`;
}

/** Parses an Adzuna created ISO string to Date; returns undefined if missing or invalid. */
export function parsePostedAt(created: string | undefined): Date | undefined {
  if (!created?.trim()) return undefined;
  const d = new Date(created);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Maps a raw Adzuna job to a NormalizedJob. */
function normalizeAdzunaJob(job: AdzunaJob, country: string): NormalizedJob {
  return {
    source: "adzuna",
    sourceId: String(job.id),
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? undefined,
    description: job.description ?? undefined,
    sourceUrl: job.redirect_url ?? buildAdzunaJobUrl(String(job.id), country),
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    postedAt: parsePostedAt(job.created),
  };
}

export const adzunaProvider: JobProvider = {
  source: "adzuna",

  supportsCountry(cc: string): boolean {
    return (SUPPORTED_COUNTRIES as readonly string[]).includes(cc);
  },

  enabled(env: Env): boolean {
    return Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
  },

  async search(ctx: SearchContext): Promise<ProviderResult> {
    const cc = ctx.country as AdzunaCountry;
    const resp = await fetchAdzunaSearch(
      ctx.env.ADZUNA_APP_ID as string,
      ctx.env.ADZUNA_APP_KEY as string,
      cc,
      ctx.page,
      {
        what: ctx.keyword,
        resultsPerPage: 20,
        where: ctx.filters?.where,
        category: ctx.filters?.category,
        fullTime: ctx.filters?.fullTime,
        permanent: ctx.filters?.permanent,
        salaryMin: ctx.filters?.salaryMin,
        sortBy: ctx.filters?.sortBy,
      }
    );
    return {
      jobs: resp.results.map((job) => normalizeAdzunaJob(job, cc)),
      totalCount: resp.count,
    };
  },
};
