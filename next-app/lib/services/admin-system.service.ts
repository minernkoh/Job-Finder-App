/**
 * Admin system service: health check (DB ping).
 */

import { connectDB } from "@/lib/db";

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
