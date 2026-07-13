/**
 * LinkedIn provider — best-effort, discovery-only. Public guest job-search endpoint
 * (no login) returning HTML job cards, parsed with node-html-parser. ToS-grey and
 * aggressively rate-limited, and blocked from most server IPs — gated behind
 * ENABLE_SCRAPER_SOURCES and degrades to [] on any block. SG only.
 * Ported from the japply CLI (sources/linkedin.py).
 */

import { parse } from "node-html-parser";
import type { Env } from "@/lib/env";
import type {
  JobProvider,
  NormalizedJob,
  ProviderResult,
  SearchContext,
} from "./types";
import { mapPool } from "./util";

const GUEST =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const JOBVIEW = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/";
const HDRS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
};
const ID_RE = /-(\d+)(?:\?|$)/;
const DETAIL_CONCURRENCY = 5;
const MAX_CARDS = 20;

export const linkedinProvider: JobProvider = {
  source: "linkedin",

  supportsCountry(cc: string): boolean {
    return cc === "sg";
  },

  enabled(env: Env): boolean {
    return env.ENABLE_SCRAPER_SOURCES;
  },

  async search(ctx: SearchContext): Promise<ProviderResult> {
    try {
      const url =
        `${GUEST}?keywords=${encodeURIComponent(ctx.keyword ?? "")}` +
        `&location=${encodeURIComponent("Singapore")}&start=0`;
      const res = await fetch(url, { headers: HDRS, redirect: "follow" });
      if (!res.ok) return { jobs: [], totalCount: 0 };
      const root = parse(await res.text());
      const cards = root.querySelectorAll("li").slice(0, MAX_CARDS);

      const parsed = cards
        .map((li) => {
          const a = li.querySelector("a[href]");
          const href = a?.getAttribute("href")?.split("?")[0];
          const rawHref = a?.getAttribute("href") ?? "";
          const m = ID_RE.exec(rawHref);
          const jid = m ? m[1] : (href ?? "").replace(/\/$/, "").split("-").pop() ?? "";
          const title =
            li.querySelector(".base-search-card__title")?.text.trim() ??
            li.querySelector("h3")?.text.trim();
          const company = li
            .querySelector(".base-search-card__subtitle")
            ?.text.trim();
          const location =
            li.querySelector(".job-search-card__location")?.text.trim() ??
            "Singapore";
          return { jid, title, company, location, href };
        })
        .filter((c): c is typeof c & { jid: string; title: string } =>
          Boolean(c.jid && c.title)
        );

      const jobs = await mapPool(parsed, DETAIL_CONCURRENCY, async (c) => {
        let description = "";
        try {
          const d = await fetch(`${JOBVIEW}${c.jid}`, { headers: HDRS });
          if (d.ok) description = parse(await d.text()).text.replace(/\s+/g, " ").trim();
        } catch {
          // best-effort
        }
        const job: NormalizedJob = {
          source: "linkedin",
          sourceId: c.jid,
          title: c.title,
          company: c.company ?? "Unknown",
          location: c.location,
          description: description || undefined,
          sourceUrl: c.href,
        };
        return job;
      });

      return { jobs, totalCount: jobs.length };
    } catch {
      return { jobs: [], totalCount: 0 };
    }
  },
};
