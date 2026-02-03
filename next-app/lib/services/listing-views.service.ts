/**
 * Listing views service: records view events and computes trending listings by recent view count.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Listing } from "@/lib/models/Listing";
import { ListingView } from "@/lib/models/ListingView";

/** Records a view for a listing. Call when user clicks a listing or opens details. */
export async function recordView(listingId: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(listingId)) return;
  const objId = new mongoose.Types.ObjectId(listingId);
  await ListingView.create({ listingId: objId, viewedAt: new Date() });
}

/** Returns top trending listing ids by view count in the given timeframe (hours). */
export async function getTrendingListingIds(
  limit: number,
  timeframeHours: number = 24
): Promise<string[]> {
  await connectDB();
  const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
  const aggregated = await ListingView.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([
    { $match: { viewedAt: { $gte: since } } },
    { $group: { _id: "$listingId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return aggregated.map((a) => String(a._id));
}
