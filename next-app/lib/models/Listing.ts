/**
 * Mongoose Listing model: caches job listings from Adzuna. Each document stores one job with source metadata and expiresAt for TTL-based cache invalidation.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IListingDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  company: string;
  location?: string;
  description?: string;
  source: "adzuna";
  sourceUrl?: string;
  sourceId: string;
  country: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  salaryMin?: number;
  salaryMax?: number;
}

const ListingSchema = new Schema<IListingDocument>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    description: { type: String },
    source: { type: String, required: true, default: "adzuna" },
    sourceUrl: { type: String },
    sourceId: { type: String, required: true },
    country: { type: String, required: true, default: "sg" },
    expiresAt: { type: Date, required: true },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
  },
  { timestamps: true }
);

// Compound index for cache lookups: find by sourceId+country, and for TTL cleanup
ListingSchema.index({ sourceId: 1, country: 1 }, { unique: true });
ListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Listing: Model<IListingDocument> =
  mongoose.models.Listing ??
  mongoose.model<IListingDocument>("Listing", ListingSchema);
