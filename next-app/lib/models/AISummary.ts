/**
 * Mongoose AISummary model: stores AI-generated job summaries with userId and inputTextHash for cache lookup.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IAISummaryDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  inputTextHash: string;
  tldr: string;
  keyResponsibilities?: string[];
  requirements?: string[];
  niceToHaves?: string[];
  salarySgd?: string;
  jdMatch?: {
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
  };
  caveats?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AISummarySchema = new Schema<IAISummaryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inputTextHash: { type: String, required: true },
    tldr: { type: String, required: true },
    keyResponsibilities: [{ type: String }],
    requirements: [{ type: String }],
    niceToHaves: [{ type: String }],
    salarySgd: { type: String },
    jdMatch: {
      matchScore: Number,
      matchedSkills: [String],
      missingSkills: [String],
    },
    caveats: [{ type: String }],
  },
  { timestamps: true }
);

AISummarySchema.index({ inputTextHash: 1, userId: 1 });
AISummarySchema.index({ userId: 1 });

export const AISummary: Model<IAISummaryDocument> =
  mongoose.models.AISummary ??
  mongoose.model<IAISummaryDocument>("AISummary", AISummarySchema);
