/**
 * Admin system service: health check (DB ping).
 */

import { getSql } from "@/lib/db";

export interface HealthCheckResult {
  status: "ok" | "degraded";
  checks: {
    database: "ok" | "error";
  };
}

/** Pings Postgres and returns health status. */
export async function getSystemHealth(): Promise<HealthCheckResult> {
  try {
    const sql = getSql();
    await sql`select 1`;
    return { status: "ok", checks: { database: "ok" } };
  } catch {
    return { status: "degraded", checks: { database: "error" } };
  }
}
