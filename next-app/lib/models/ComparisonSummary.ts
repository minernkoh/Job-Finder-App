/**
 * Mongoose ComparisonSummary model: stores AI-generated comparison summaries for 2–3 listings.
 * Used for cache lookup by userId and listingIdsKey (canonical sorted IDs).
 */

import mongoose, { Schema, Model } from "mongoose";

const ListingMatchScoreSchema = new Schema(
  {
    listingId: { type: String, required: true },
    matchScore: { type: Number, required: true },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
  },
  { _id: false }
);

export interface IComparisonSummaryDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  listingIdsKey: string;
  summary: string;
  similarities?: string[];
  differences?: string[];
  comparisonPoints?: string[];
  recommendedListingId?: string;
  recommendationReason?: string;
  listingMatchScores?: Array<{
    listingId: string;
    matchScore: number;
    matchedSkills?: string[];
    missingSkills?: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ComparisonSummarySchema = new Schema<IComparisonSummaryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingIdsKey: { type: String, required: true },
    summary: { type: String, required: true },
    similarities: [{ type: String }],
    differences: [{ type: String }],
    comparisonPoints: [{ type: String }],
    recommendedListingId: { type: String },
    recommendationReason: { type: String },
    listingMatchScores: [ListingMatchScoreSchema],
  },
  { timestamps: true }
);

ComparisonSummarySchema.index({ userId: 1, listingIdsKey: 1 });

export const ComparisonSummary: Model<IComparisonSummaryDocument> =
  mongoose.models.ComparisonSummary ??
  mongoose.model<IComparisonSummaryDocument>(
    "ComparisonSummary",
    ComparisonSummarySchema
  );
