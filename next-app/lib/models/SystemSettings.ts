/**
 * Mongoose SystemSettings model: singleton config for cache TTL, rate limits, and admin-tunable options.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface ISystemSettingsDocument {
  _id: mongoose.Types.ObjectId;
  cacheTTL?: number;
  rateLimitPerMinute?: number;
  maxListingsPerUser?: number;
  updatedAt?: Date;
  updatedBy?: string;
}

const SystemSettingsSchema = new Schema<ISystemSettingsDocument>(
  {
    cacheTTL: { type: Number },
    rateLimitPerMinute: { type: Number },
    maxListingsPerUser: { type: Number },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const SystemSettings: Model<ISystemSettingsDocument> =
  mongoose.models.SystemSettings ??
  mongoose.model<ISystemSettingsDocument>("SystemSettings", SystemSettingsSchema);
