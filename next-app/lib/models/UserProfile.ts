/**
 * Mongoose UserProfile model: stores parsed resume data (skills, job titles, summary) per user for matching and resume-based search.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { UserProfile as UserProfileType } from "@schemas";

export interface IUserProfileDocument extends UserProfileType {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: { type: [String], default: [] },
    jobTitles: { type: [String], default: [] },
    resumeSummary: { type: String },
    yearsOfExperience: { type: Number, required: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const UserProfile: Model<IUserProfileDocument> =
  mongoose.models.UserProfile ??
  mongoose.model<IUserProfileDocument>("UserProfile", UserProfileSchema);
