/**
 * Mongoose TailoredResume: cached JD-tailored resume content per user, listing, and profile hash.
 */

import mongoose, { Schema, type Model } from "mongoose";
import type { TailoredResumeContent } from "@schemas";

export interface ITailoredResumeDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  profileHash: string;
  listingTitle: string;
  listingCompany: string;
  content: TailoredResumeContent;
  createdAt: Date;
  updatedAt: Date;
}

const TailoredResumeSchema = new Schema<ITailoredResumeDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    profileHash: { type: String, required: true },
    listingTitle: { type: String, required: true },
    listingCompany: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

TailoredResumeSchema.index(
  { userId: 1, listingId: 1, profileHash: 1 },
  { unique: true },
);

export const TailoredResume: Model<ITailoredResumeDocument> =
  mongoose.models.TailoredResume ??
  mongoose.model<ITailoredResumeDocument>("TailoredResume", TailoredResumeSchema);
