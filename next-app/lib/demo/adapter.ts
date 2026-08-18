/**
 * Guest preview API adapter: returns synthetic responses for auth-gated routes,
 * and forwards parse/tailor to guest Gemini endpoints.
 */

import type { InternalAxiosRequestConfig } from "axios";
import type { ListingResult, ResumeParseResult, TailoredResumeResult } from "@schemas";
import type { ComparisonStreamResult } from "@/lib/api/summaries";
import type { StreamSummaryResult } from "@/lib/api/summaries";
import { DEMO_USER } from "./constants";
import {
  buildCannedComparison,
  buildCannedSkillSuggest,
  buildCannedSummary,
  comparisonStreamPartials,
  summaryStreamPartials,
} from "./canned-ai";
import { createSimulatedNdjsonReader, ndjsonStreamResponse } from "./stream";
import {
  getDemoComparison,
  getDemoProfile,
  getDemoSavedListings,
  getDemoSummary,
  getDemoTailored,
  isDemoListingSaved,
  saveDemoListing,
  setDemoComparison,
  setDemoSummary,
  setDemoTailored,
  unsaveDemoListing,
  updateDemoProfile,
} from "./store";

type ApiSuccess<T> = { success: true; data: T };
type ApiBody = ApiSuccess<unknown> | { success: false; message: string };

const RECOMMENDED_LIMIT = 10;

/** Thrown when a forwarded guest API returns a non-2xx status. */
export class DemoHttpError extends Error {
  status: number;
  body: { success: false; message: string };

  constructor(status: number, message: string) {
    super(message);
    this.name = "DemoHttpError";
    this.status = status;
    this.body = { success: false, message };
  }
}

function ok<T>(data: T): ApiBody {
  return { success: true, data };
}

function requestPath(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? "";
  if (url.startsWith("http")) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url.split("?")[0] ?? url;
}

function requestSearch(config: InternalAxiosRequestConfig): URLSearchParams {
  const url = config.url ?? "";
  const q = url.includes("?") ? url.split("?")[1] : "";
  return new URLSearchParams(q);
}

async function readDemoResponse(res: Response): Promise<ApiBody> {
  let json: { success?: boolean; message?: string; data?: unknown } = {};
  try {
    json = (await res.json()) as { success?: boolean; message?: string; data?: unknown };
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new DemoHttpError(
      res.status,
      json.message ?? `Request failed (${res.status})`,
    );
  }
  return json as ApiBody;
}

async function forwardDemoJson(url: string, body: unknown): Promise<ApiBody> {
  const payload = typeof body === "string" ? body : JSON.stringify(body ?? {});
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  return readDemoResponse(res);
}

async function forwardDemoForm(url: string, form: FormData): Promise<ApiBody> {
  const res = await fetch(url, { method: "POST", body: form });
  return readDemoResponse(res);
}

/** Fetches a listing via the public API (bypasses demo interceptor). */
export async function fetchPublicListing(id: string): Promise<ListingResult> {
  const res = await fetch(`/api/v1/listings/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Listing not found");
  const json = (await res.json()) as ApiSuccess<ListingResult>;
  if (!json.success || !json.data) throw new Error("Listing not found");
  return json.data;
}

async function fetchPublicSearch(
  keyword?: string,
): Promise<{ listings: ListingResult[]; totalCount: number }> {
  const params = new URLSearchParams({ country: "sg", page: "1" });
  if (keyword) params.set("keyword", keyword);
  const res = await fetch(`/api/v1/listings?${params.toString()}`);
  if (!res.ok) return { listings: [], totalCount: 0 };
  const json = (await res.json()) as ApiSuccess<{
    listings: ListingResult[];
    totalCount: number;
  }>;
  return {
    listings: json.data?.listings ?? [],
    totalCount: json.data?.totalCount ?? 0,
  };
}

function recommendedKeyword(): string {
  const profile = getDemoProfile();
  const title = profile.jobTitles?.[0]?.trim();
  if (title) return title;
  if (profile.skills?.length) return profile.skills.slice(0, 3).join(" ");
  return "Software Engineer";
}

async function fetchPublicListings(ids: string[]): Promise<ListingResult[]> {
  const results = await Promise.all(
    ids.map((id) => fetchPublicListing(id).catch(() => null)),
  );
  return results.filter((l): l is ListingResult => l != null);
}

/** Returns true when this axios request should be handled locally in preview mode. */
export function isDemoInterceptUrl(path: string): boolean {
  if (path.includes("/auth/login") || path.includes("/auth/register")) {
    return false;
  }
  if (path.includes("/auth/refresh") || path.includes("/auth/logout")) {
    return false;
  }
  const gated = [
    "/api/v1/profile",
    "/api/v1/saved",
    "/api/v1/summaries",
    "/api/v1/resume/parse",
    "/api/v1/resume/tailor",
    "/api/v1/profile/suggest-skills",
    "/api/v1/listings/recommended",
    "/api/v1/users/me",
    "/api/v1/auth/unlock-ai",
  ];
  return gated.some((p) => path.startsWith(p) || path.includes(p));
}

/** Handles an intercepted axios request and returns the response body. */
export async function handleDemoAxiosRequest(
  config: InternalAxiosRequestConfig,
): Promise<ApiBody> {
  const path = requestPath(config);
  const method = (config.method ?? "get").toLowerCase();
  const params = requestSearch(config);
  const body = config.data;

  if (path.includes("/users/me") && method === "get") {
    return ok(DEMO_USER);
  }

  if (path.includes("/profile/suggest-skills") && method === "post") {
    const parsed =
      typeof body === "string"
        ? (JSON.parse(body) as { currentRole?: string })
        : (body as { currentRole?: string });
    return ok(buildCannedSkillSuggest(parsed?.currentRole ?? "Software Engineer"));
  }

  if (path.includes("/resume/parse") && method === "post") {
    const result =
      body instanceof FormData
        ? await forwardDemoForm("/api/v1/demo/resume/parse", body)
        : await forwardDemoJson("/api/v1/demo/resume/parse", body);
    if (result.success) {
      updateDemoProfile(result.data as ResumeParseResult);
    }
    return result;
  }

  if (path.includes("/profile") && method === "get") {
    return ok(getDemoProfile());
  }

  if (path.includes("/profile") && method === "put") {
    const parsed =
      typeof body === "string" ? JSON.parse(body) : (body as Record<string, unknown>);
    return ok(updateDemoProfile(parsed));
  }

  if (path.includes("/saved/check") && method === "get") {
    const listingId = params.get("listingId") ?? "";
    return ok({ saved: isDemoListingSaved(listingId) });
  }

  if (path.match(/\/saved\/[^/]+$/) && method === "delete") {
    const listingId = path.split("/").pop() ?? "";
    unsaveDemoListing(listingId);
    return ok(undefined);
  }

  if (path.endsWith("/saved") && method === "get") {
    return ok({ listings: getDemoSavedListings() });
  }

  if (path.endsWith("/saved") && method === "post") {
    const parsed =
      typeof body === "string" ? JSON.parse(body) : (body as ListingResult & { listingId?: string });
    const listing: ListingResult = {
      id: parsed.listingId ?? parsed.id,
      title: parsed.title,
      company: parsed.company,
      location: parsed.location,
      sourceUrl: parsed.sourceUrl,
      country: parsed.country ?? "sg",
      source: "adzuna",
    };
    return ok(saveDemoListing(listing));
  }

  if (path.includes("/summaries/compare") && method === "post") {
    const parsed =
      typeof body === "string"
        ? JSON.parse(body)
        : (body as { listingIds: string[]; forceRegenerate?: boolean });
    const listings = await fetchPublicListings(parsed.listingIds ?? []);
    const comparison = buildCannedComparison(listings);
    setDemoComparison(parsed.listingIds, comparison);
    return ok(comparison);
  }

  if (path.includes("/summaries") && method === "get") {
    const listingId = params.get("listingId") ?? "";
    const cached = getDemoSummary(listingId);
    if (!cached) {
      throw Object.assign(new Error("Summary not found"), { response: { status: 404 } });
    }
    return ok(cached);
  }

  if (path.includes("/resume/tailor") && !path.includes("/file") && method === "post") {
    const parsed =
      typeof body === "string"
        ? (JSON.parse(body) as { listingId: string; forceRegenerate?: boolean })
        : (body as { listingId: string; forceRegenerate?: boolean });
    if (!parsed.forceRegenerate) {
      const existing = getDemoTailored(parsed.listingId);
      if (existing) return ok(existing);
    }
    const result = await forwardDemoJson("/api/v1/demo/resume/tailor", {
      listingId: parsed.listingId,
      forceRegenerate: parsed.forceRegenerate,
      profile: getDemoProfile(),
    });
    if (result.success) {
      setDemoTailored(result.data as TailoredResumeResult);
    }
    return result;
  }

  if (path.includes("/listings/recommended") && method === "get") {
    const { listings, totalCount } = await fetchPublicSearch(recommendedKeyword());
    const recommended = listings.slice(0, RECOMMENDED_LIMIT);
    return ok({ listings: recommended, totalCount });
  }

  if (path.includes("/auth/unlock-ai") && method === "post") {
    return ok({ aiEnabled: true });
  }

  throw new Error(`Preview adapter: unhandled ${method} ${path}`);
}

/** GET summary for listing (fetch helper). */
export async function handleDemoGetSummary(listingId: string) {
  const cached = getDemoSummary(listingId);
  if (cached) return cached;
  return null;
}

/** POST /summaries/stream */
export async function handleDemoSummaryStream(body: {
  listingId?: string;
  forceRegenerate?: boolean;
}): Promise<StreamSummaryResult> {
  const listingId = body.listingId ?? "";
  if (!body.forceRegenerate) {
    const cached = getDemoSummary(listingId);
    if (cached) return { stream: false, data: cached };
  }
  const listing = await fetchPublicListing(listingId);
  const profile = getDemoProfile();
  const final = buildCannedSummary(listing, profile);
  setDemoSummary(listingId, final);
  const partials = summaryStreamPartials(listing, profile);
  const reader = await createSimulatedNdjsonReader(partials, final);
  return { stream: true, reader };
}

/** POST /summaries/compare/stream */
export async function handleDemoComparisonStream(body: {
  listingIds: string[];
  forceRegenerate?: boolean;
}): Promise<ComparisonStreamResult> {
  const ids = body.listingIds ?? [];
  if (!body.forceRegenerate) {
    const cached = getDemoComparison(ids);
    if (cached) return { stream: false, data: cached };
  }
  const listings = await fetchPublicListings(ids);
  const profile = getDemoProfile();
  const final = buildCannedComparison(listings, profile);
  setDemoComparison(ids, final);
  const partials = comparisonStreamPartials(listings, profile);
  const reader = await createSimulatedNdjsonReader(partials, final);
  return { stream: true, reader };
}

/** Demo fetch for getSummaryForListing raw fetch path. */
export async function handleDemoSummaryFetch(listingId: string): Promise<Response> {
  const cached = getDemoSummary(listingId);
  if (!cached) {
    return new Response(JSON.stringify({ success: false, message: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(ok(cached)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Demo fetch wrapper for summary stream POST. */
export async function handleDemoSummaryStreamFetch(
  body: { listingId?: string; forceRegenerate?: boolean },
): Promise<Response> {
  const result = await handleDemoSummaryStream(body);
  if (!result.stream) {
    return new Response(JSON.stringify(ok(result.data)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return ndjsonStreamResponse(result.reader);
}

/** Demo fetch wrapper for compare stream POST. */
export async function handleDemoComparisonStreamFetch(
  body: { listingIds: string[]; forceRegenerate?: boolean },
): Promise<Response> {
  const result = await handleDemoComparisonStream(body);
  if (!result.stream) {
    return new Response(JSON.stringify(ok(result.data)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return ndjsonStreamResponse(result.reader);
}
