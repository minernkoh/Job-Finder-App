/**
 * GET /api/v1/listings: search job listings with keyword, country, and Adzuna-aligned filters. Returns paginated results from Adzuna (cached).
 * POST: create listing (admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { ListingCreateSchema } from "@schemas";
import { parseJsonBody, toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { SORT_BY_ALLOWLIST } from "@/lib/constants/listings";
import { requireAdmin } from "@/lib/auth/guard";
import type { ListingsFilters } from "@/lib/types/listings";
import {
  createListing,
  searchListings,
} from "@/lib/services/listings.service";

function parseBool(value: string | null): boolean {
  if (value == null) return false;
  const v = value.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "sg";
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1
    );
    const keyword = searchParams.get("keyword")?.trim() ?? undefined;
    const where = searchParams.get("where")?.trim() ?? undefined;
    const category = searchParams.get("category")?.trim() ?? undefined;
    const fullTime = parseBool(searchParams.get("full_time"));
    const permanent = parseBool(searchParams.get("permanent"));
    const salaryMinRaw = searchParams.get("salary_min");
    const salaryMin =
      salaryMinRaw != null
        ? Math.max(0, parseInt(salaryMinRaw, 10) || 0)
        : undefined;
    const sortByRaw = searchParams.get("sort_by")?.trim();
    const sortBy =
      sortByRaw &&
      SORT_BY_ALLOWLIST.includes(
        sortByRaw as (typeof SORT_BY_ALLOWLIST)[number]
      )
        ? sortByRaw
        : undefined;

    const filters: ListingsFilters = {};
    if (where) filters.where = where;
    if (category) filters.category = category;
    if (fullTime) filters.fullTime = true;
    if (permanent) filters.permanent = true;
    if (salaryMin != null && salaryMin > 0) filters.salaryMin = salaryMin;
    if (sortBy) filters.sortBy = sortBy;

    const { listings, totalCount } = await searchListings(
      country,
      page,
      keyword,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({
      success: true,
      data: { listings, totalCount, page },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch listings");
  }
}

/** Creates a listing (admin only). */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const [body, parseError] = await parseJsonBody(request);
    if (parseError) return parseError;
    const parsed = ListingCreateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");
    const listing = await createListing(parsed.data);
    return NextResponse.json({ success: true, data: listing });
  } catch (err) {
    return toErrorResponse(err, "Failed to create listing");
  }
}
