/**
 * MyCareersFuture provider — the reliable Singapore spine. Public JSON API, no auth:
 *   POST /v2/search      -> listing cards (no full JD)
 *   GET  /v2/jobs/{uuid} -> full JD (`description`) + metadata.jobDetailsUrl
 * Ported from the japply CLI (sources/mcf.py). SG only. Best-effort: resolves to [] on failure.
 */

import type {
  JobProvider,
  NormalizedJob,
  ProviderResult,
  SearchContext,
} from "./types";
import { stripHtml, mapPool } from "./util";

const BASE = "https://api.mycareersfuture.gov.sg/v2";
const HDRS = { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" };
const DETAIL_CONCURRENCY = 5;

interface McfCard {
  uuid?: string;
  title?: string;
  postedCompany?: { name?: string } | null;
  hiringCompany?: { name?: string } | null;
  address?: { district?: string; region?: string } | null;
  salary?: { minimum?: number; maximum?: number } | null;
  metadata?: {
    jobPostId?: string;
    jobDetailsUrl?: string;
    newPostingDate?: string;
    originalPostingDate?: string;
  } | null;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export const mcfProvider: JobProvider = {
  source: "mcf",

  supportsCountry(cc: string): boolean {
    return cc === "sg";
  },

  enabled(): boolean {
    return true; // public API, no key required
  },

  async search(ctx: SearchContext): Promise<ProviderResult> {
    try {
      const res = await fetch(`${BASE}/search?limit=20&page=0`, {
        method: "POST",
        headers: HDRS,
        body: JSON.stringify({
          search: ctx.keyword ?? "",
          sessionId: "",
          sortBy: ["new_posting_date"],
        }),
      });
      if (!res.ok) return { jobs: [], totalCount: 0 };
      const data = (await res.json()) as { results?: McfCard[]; total?: number };
      const cards = data.results ?? [];

      const jobs = await mapPool(cards, DETAIL_CONCURRENCY, async (j) => {
        const meta = j.metadata ?? {};
        const company =
          j.postedCompany?.name ?? j.hiringCompany?.name ?? "Unknown";
        const loc = j.address?.district ?? j.address?.region ?? "Singapore";
        let url = meta.jobDetailsUrl;
        let description = "";

        if (j.uuid) {
          try {
            const d = await fetch(`${BASE}/jobs/${j.uuid}`, { headers: HDRS });
            if (d.ok) {
              const detail = (await d.json()) as {
                description?: string;
                metadata?: { jobDetailsUrl?: string };
              };
              description = stripHtml(detail.description);
              url = url ?? detail.metadata?.jobDetailsUrl;
            }
          } catch {
            // best-effort: leave description empty
          }
        }

        const salary = j.salary ?? {};
        const job: NormalizedJob = {
          source: "mcf",
          sourceId: meta.jobPostId ?? j.uuid ?? "",
          title: (j.title ?? "").trim(),
          company,
          location: loc,
          description: description || undefined,
          sourceUrl: url,
          salaryMin: salary.minimum,
          salaryMax: salary.maximum,
          postedAt: parseDate(meta.newPostingDate ?? meta.originalPostingDate),
        };
        return job;
      });

      const valid = jobs.filter((j) => j.sourceId && j.title);
      return {
        jobs: valid,
        totalCount: typeof data.total === "number" ? data.total : valid.length,
      };
    } catch {
      return { jobs: [], totalCount: 0 };
    }
  },
};
