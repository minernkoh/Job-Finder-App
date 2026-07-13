/**
 * Mongoose SavedListing model: stores user's saved/bookmarked listings. Snapshot fields allow display without joining Listing (which may expire).
 */

import mongoose, { Schema, Model } from "mongoose";
import type { ListingSource } from "@schemas";

export interface ISavedListingDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  title: string;
  company: string;
  location?: string;
  sourceUrl?: string;
  country?: string;
  /** Job source at save time; optional for docs predating multi-source. */
  source?: ListingSource;
  createdAt: Date;
}

const SavedListingSchema = new Schema<ISavedListingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    sourceUrl: { type: String },
    country: { type: String },
    source: { type: String },
  },
  { timestamps: true }
);

SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const SavedListing: Model<ISavedListingDocument> =
  mongoose.models.SavedListing ??
  mongoose.model<ISavedListingDocument>("SavedListing", SavedListingSchema);
