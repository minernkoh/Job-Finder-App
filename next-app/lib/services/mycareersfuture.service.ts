/**
 * MyCareersFuture public JSON client. Search returns cards; fetchJobByUuid hydrates a full JD.
 */

import { stripHtmlToText } from "@/lib/text";

const BASE = "https://api.mycareersfuture.gov.sg/v2";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; JobFinder/1.0; +https://github.com/job-finder)",
};

export interface McfSearchItem {
  sourceId: string;
  uuid: string;
  title: string;
  company: string;
  location: string;
  sourceUrl?: string;
  postedAt?: Date;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
}

interface McfRawJob {
  uuid?: string;
  title?: string;
  description?: string;
  salary?: { minimum?: number; maximum?: number };
  postedCompany?: { name?: string };
  hiringCompany?: { name?: string };
  address?: { district?: string; region?: string };
  metadata?: {
    jobPostId?: string;
    jobDetailsUrl?: string;
    newPostingDate?: string;
    originalPostingDate?: string;
  };
}

function companyName(j: McfRawJob): string {
  return (
    j.postedCompany?.name ||
    j.hiringCompany?.name ||
    "Unknown"
  );
}

function locationOf(j: McfRawJob): string {
  return j.address?.district || j.address?.region || "Singapore";
}

function postedAtOf(j: McfRawJob): Date | undefined {
  const raw =
    j.metadata?.newPostingDate || j.metadata?.originalPostingDate;
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function mapCard(j: McfRawJob): McfSearchItem | null {
  const uuid = j.uuid;
  if (!uuid) return null;
  const sourceId = j.metadata?.jobPostId || uuid;
  return {
    sourceId: String(sourceId),
    uuid,
    title: (j.title ?? "").trim() || "Untitled",
    company: companyName(j),
    location: locationOf(j),
    sourceUrl:
      j.metadata?.jobDetailsUrl ||
      `https://www.mycareersfuture.gov.sg/job/${uuid}`,
    postedAt: postedAtOf(j),
    salaryMin: j.salary?.minimum,
    salaryMax: j.salary?.maximum,
    description: j.description ? stripHtmlToText(j.description) : undefined,
  };
}

/** Search MCF. page is 1-based like Adzuna; MCF API is 0-based. Fail-soft: returns [] on error. */
export async function searchMcfJobs(
  keywords: string,
  page = 1,
  limit = 20,
): Promise<McfSearchItem[]> {
  try {
    const mcfPage = Math.max(0, page - 1);
    const res = await fetch(
      `${BASE}/search?limit=${encodeURIComponent(String(limit))}&page=${mcfPage}`,
      {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          search: keywords,
          sessionId: "",
          sortBy: ["new_posting_date"],
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: McfRawJob[] };
    const results = json.results ?? [];
    return results.map(mapCard).filter((j): j is McfSearchItem => j != null);
  } catch {
    return [];
  }
}

/** Fetch full job by MCF uuid. Returns description text or null. */
export async function fetchMcfJobByUuid(
  uuid: string,
): Promise<{ description: string; sourceUrl?: string } | null> {
  try {
    const res = await fetch(`${BASE}/jobs/${encodeURIComponent(uuid)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as McfRawJob;
    const description = stripHtmlToText(d.description ?? "");
    const sourceUrl = d.metadata?.jobDetailsUrl;
    if (!description && !sourceUrl) return null;
    return { description, sourceUrl };
  } catch {
    return null;
  }
}
