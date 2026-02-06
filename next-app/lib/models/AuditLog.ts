/**
 * Mongoose AuditLog model: stores admin actions (who, what, when, resource, IP, user-agent) for accountability.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IAuditLogDocument {
  _id: mongoose.Types.ObjectId;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    adminId: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);
