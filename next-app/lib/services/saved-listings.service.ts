/**
 * Saved listings service: save/unsave listings for a user, and fetch user's saved listings.
 */

import type { SavedListingResult, SaveListingBody } from "@schemas";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { parseObjectId } from "@/lib/objectid";
import { SavedListing } from "@/lib/models/SavedListing";
import { getListingById } from "./listings.service";

/** Maps a SavedListing document to API SavedListingResult shape. */
function docToSavedListingResult(doc: {
  _id: unknown;
  listingId: unknown;
  title: string;
  company: string;
  location?: string;
  sourceUrl?: string;
  country?: string;
  createdAt: Date;
}): SavedListingResult {
  return {
    id: String(doc._id),
    listingId: String(doc.listingId),
    title: doc.title,
    company: doc.company,
    location: doc.location,
    sourceUrl: doc.sourceUrl,
    country: doc.country,
    savedAt: doc.createdAt.toISOString(),
  };
}

/** Saves a listing for a user. Idempotent. */
export async function saveListing(
  userId: string,
  input: SaveListingBody
): Promise<SavedListingResult> {
  await connectDB();
  const uid = new mongoose.Types.ObjectId(userId);
  const lid = new mongoose.Types.ObjectId(input.listingId);
  const doc = await SavedListing.findOneAndUpdate(
    { userId: uid, listingId: lid },
    {
      $set: {
        userId: uid,
        listingId: lid,
        title: input.title,
        company: input.company,
        location: input.location,
        sourceUrl: input.sourceUrl,
        country: input.country,
      },
    },
    { upsert: true, new: true }
  );
  return docToSavedListingResult(doc);
}

/** Unsaves a listing for a user. */
export async function unsaveListing(
  userId: string,
  listingId: string
): Promise<boolean> {
  await connectDB();
  const lid = parseObjectId(listingId);
  if (!lid) return false;
  const result = await SavedListing.deleteOne({
    userId: new mongoose.Types.ObjectId(userId),
    listingId: lid,
  });
  return (result.deletedCount ?? 0) > 0;
}

/** Returns whether the user has saved the listing. */
export async function isListingSaved(
  userId: string,
  listingId: string
): Promise<boolean> {
  await connectDB();
  const lid = parseObjectId(listingId);
  if (!lid) return false;
  const doc = await SavedListing.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    listingId: lid,
  }).lean();
  return !!doc;
}

/** Returns all saved listings for a user. */
export async function getSavedListings(
  userId: string
): Promise<SavedListingResult[]> {
  await connectDB();
  const docs = await SavedListing.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(docToSavedListingResult);
}
