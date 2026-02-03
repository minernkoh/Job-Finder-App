/**
 * Mongoose SearchCache model: caches Adzuna search results by query hash. Reduces API calls when same search is repeated within TTL.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface ISearchCacheDocument {
  _id: mongoose.Types.ObjectId;
  cacheKey: string;
  listingIds: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const SearchCacheSchema = new Schema<ISearchCacheDocument>(
  {
    cacheKey: { type: String, required: true, unique: true },
    listingIds: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SearchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SearchCache: Model<ISearchCacheDocument> =
  mongoose.models.SearchCache ??
  mongoose.model<ISearchCacheDocument>("SearchCache", SearchCacheSchema);
