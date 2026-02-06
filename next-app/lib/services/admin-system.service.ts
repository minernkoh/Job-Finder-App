/**
 * Admin system service: get/update system settings (singleton), health check.
 */

import { connectDB } from "@/lib/db";
import { SystemSettings } from "@/lib/models/SystemSettings";
import type { SystemSettingsUpdate } from "@schemas";

export interface SystemSettingsResult {
  cacheTTL?: number;
  rateLimitPerMinute?: number;
  maxListingsPerUser?: number;
  updatedAt?: Date;
  updatedBy?: string;
}

/** Returns the single system settings document (or defaults). */
export async function getSystemSettings(): Promise<SystemSettingsResult> {
  await connectDB();
  const doc = await SystemSettings.findOne().lean();
  if (!doc) {
    return {};
  }
  return {
    cacheTTL: doc.cacheTTL,
    rateLimitPerMinute: doc.rateLimitPerMinute,
    maxListingsPerUser: doc.maxListingsPerUser,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  };
}

/** Updates system settings (partial); creates document if none exists. */
export async function updateSystemSettings(
  update: SystemSettingsUpdate,
  updatedBy: string
): Promise<SystemSettingsResult> {
  await connectDB();
  const doc = await SystemSettings.findOneAndUpdate(
    {},
    {
      ...update,
      updatedBy,
    },
    { new: true, upsert: true }
  ).lean();
  return {
    cacheTTL: doc?.cacheTTL,
    rateLimitPerMinute: doc?.rateLimitPerMinute,
    maxListingsPerUser: doc?.maxListingsPerUser,
    updatedAt: doc?.updatedAt,
    updatedBy: doc?.updatedBy,
  };
}

export interface HealthCheckResult {
  status: "ok" | "degraded";
  checks: {
    database: "ok" | "error";
  };
}

/** Pings MongoDB and returns health status. */
export async function getSystemHealth(): Promise<HealthCheckResult> {
  try {
    const conn = await connectDB();
    const db = conn.connection.db;
    if (!db) throw new Error("No database connection");
    await db.admin().ping();
    return { status: "ok", checks: { database: "ok" } };
  } catch {
    return { status: "degraded", checks: { database: "error" } };
  }
}
