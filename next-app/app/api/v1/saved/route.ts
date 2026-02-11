/**
 * GET /api/v1/saved: returns the current user's saved listings. Requires auth.
 * POST /api/v1/saved: save a listing for the current user. Requires auth.
 */

import { SaveListingBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import {
  getSavedListings,
  saveListing,
} from "@/lib/services/saved-listings.service";

async function getSavedHandler(
  _request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const listings = await getSavedListings(payload.sub);
  return NextResponse.json({ success: true, data: { listings } });
}

async function postSavedHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = SaveListingBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");
  const saved = await saveListing(payload.sub, parsed.data);
  return NextResponse.json({ success: true, data: saved });
}

export const GET = withAuth(getSavedHandler, "Failed to fetch saved listings");
export const POST = withAuth(postSavedHandler, "Failed to save listing");
