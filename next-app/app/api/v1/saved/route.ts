/**
 * GET /api/v1/saved: returns the current user's saved listings. Requires auth.
 * POST /api/v1/saved: save a listing for the current user. Requires auth.
 */

import { SaveListingBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/request";
import { toErrorResponse } from "@/lib/api/errors";
import {
  getSavedListings,
  saveListing,
} from "@/lib/services/saved-listings.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;
  try {
    const listings = await getSavedListings(payload.sub);
    return NextResponse.json({ success: true, data: { listings } });
  } catch (err) {
    return toErrorResponse(err, "Failed to fetch saved listings");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const payload = auth;
  try {
    const body = await request.json();
    const parsed = SaveListingBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid body",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    const saved = await saveListing(payload.sub, parsed.data);
    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    return toErrorResponse(err, "Failed to save listing");
  }
}
