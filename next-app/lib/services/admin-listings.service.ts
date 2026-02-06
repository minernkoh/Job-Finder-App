/**
 * Admin listings service: paginated list of cached listings for admin view.
 */

import { connectDB } from "@/lib/db";
import { Listing } from "@/lib/models/Listing";

export interface ListListingsParams {
  page?: number;
  limit?: number;
}

export interface ListListingsResult {
  listings: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    country: string;
    sourceId: string;
    expiresAt: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of listings (cached jobs). */
export async function listListings(
  params: ListListingsParams
): Promise<ListListingsResult> {
  await connectDB();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const [listings, total] = await Promise.all([
    Listing.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Listing.countDocuments(),
  ]);

  return {
    listings: listings.map((l) => ({
      id: (l as { _id: { toString(): string } })._id.toString(),
      title: (l as { title: string }).title,
      company: (l as { company: string }).company,
      location: (l as { location?: string }).location,
      country: (l as { country: string }).country,
      sourceId: (l as { sourceId: string }).sourceId,
      expiresAt: (l as { expiresAt: Date }).expiresAt.toISOString(),
      createdAt: (l as { createdAt: Date }).createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
