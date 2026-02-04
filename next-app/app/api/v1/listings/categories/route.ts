/**
 * GET /api/v1/listings/categories: returns job categories for a country from Adzuna. Used to populate the category filter dropdown.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { getEnv } from "@/lib/env";
import {
  fetchAdzunaCategories,
  validateCountry,
  type AdzunaCountry,
} from "@/lib/services/adzuna.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? "sg";
    const cc = validateCountry(country) as AdzunaCountry;

    const env = getEnv();
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      return NextResponse.json(
        { success: false, message: "Adzuna credentials not configured" },
        { status: 503 }
      );
    }

    const categories = await fetchAdzunaCategories(
      env.ADZUNA_APP_ID,
      env.ADZUNA_APP_KEY,
      cc
    );

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch categories");
  }
}
