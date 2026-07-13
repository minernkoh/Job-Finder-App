/**
 * JobStreet (SEEK) provider — best-effort, discovery-only. Public search JSON:
 *   GET /api/jobsearch/v5/search        -> cards with teaser JD
 *   GET /api/jobsearch/v5/job/{id}      -> full JD (data.job.content.html)
 * Behind Cloudflare in places and blocked from most server IPs — gated behind
 * ENABLE_SCRAPER_SOURCES and degrades to [] on any block. SG only.
 * Ported from the japply CLI (sources/jobstreet.py).
 */

import type { Env } from "@/lib/env";
import type {
  JobProvider,
  NormalizedJob,
  ProviderResult,
  SearchContext,
} from "./types";
import { stripHtml, mapPool } from "./util";

const SEARCH = "https://sg.jobstreet.com/api/jobsearch/v5/search";
const DETAIL = "https://sg.jobstreet.com/api/jobsearch/v5/job/";
const VIEW = "https://sg.jobstreet.com/job/";
const HDRS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "application/json",
};
const DETAIL_CONCURRENCY = 5;

interface JsCard {
  id?: string | number;
  title?: string;
  companyName?: string;
  advertiser?: { description?: string } | null;
  locations?: { label?: string }[] | null;
  teaser?: string;
  listingDate?: string;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export const jobstreetProvider: JobProvider = {
  source: "jobstreet",

  supportsCountry(cc: string): boolean {
    return cc === "sg";
  },

  enabled(env: Env): boolean {
    return env.ENABLE_SCRAPER_SOURCES;
  },

  async search(ctx: SearchContext): Promise<ProviderResult> {
    try {
      const params = new URLSearchParams({
        siteKey: "SG-Main",
        keywords: ctx.keyword ?? "",
        page: "1",
        pageSize: "20",
        locale: "en-SG",
        sortmode: "ListedDate",
      });
      const res = await fetch(`${SEARCH}?${params.toString()}`, {
        headers: HDRS,
        redirect: "follow",
      });
      if (!res.ok) return { jobs: [], totalCount: 0 };
      const data = (await res.json()) as { data?: JsCard[]; totalCount?: number };
      const cards = data.data ?? [];

      const jobs = await mapPool(cards, DETAIL_CONCURRENCY, async (j) => {
        const jid = String(j.id ?? "");
        const loc =
          (j.locations ?? [])
            .map((l) => l.label ?? "")
            .filter(Boolean)
            .join(", ") || "Singapore";
        let description = stripHtml(j.teaser);
        try {
          const d = await fetch(`${DETAIL}${jid}`, { headers: HDRS });
          if (d.ok) {
            const detail = (await d.json()) as {
              data?: { job?: { content?: { html?: string } } };
            };
            const html = detail.data?.job?.content?.html;
            if (html) description = stripHtml(html);
          }
        } catch {
          // best-effort: keep the teaser
        }
        const job: NormalizedJob = {
          source: "jobstreet",
          sourceId: jid,
          title: (j.title ?? "").trim(),
          company: j.companyName ?? j.advertiser?.description ?? "Unknown",
          location: loc,
          description: description || undefined,
          sourceUrl: `${VIEW}${jid}`,
          postedAt: parseDate(j.listingDate),
        };
        return job;
      });

      const valid = jobs.filter((j) => j.sourceId && j.title);
      return {
        jobs: valid,
        totalCount:
          typeof data.totalCount === "number" ? data.totalCount : valid.length,
      };
    } catch {
      return { jobs: [], totalCount: 0 };
    }
  },
};
