/**
 * Audit service: logs admin actions (who, what, when, resource, IP, user-agent) to the AuditLog collection for accountability.
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/lib/models/AuditLog";
import type { AccessPayload } from "@/lib/auth/jwt";

export interface AuditLogParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/** Extracts client IP from request (x-forwarded-for or x-real-ip in production). */
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

/** Writes an audit log entry. Call after successful admin mutations. Does not throw; logs errors. */
export async function logAudit(
  request: NextRequest,
  adminPayload: AccessPayload,
  params: AuditLogParams
): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      adminId: adminPayload.sub,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}

export interface ListAuditLogsParams {
  adminId?: string;
  action?: string;
  resourceType?: string;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsResult {
  logs: Array<{
    id: string;
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of audit log entries with optional filters. */
export async function listAuditLogs(
  params: ListAuditLogsParams
): Promise<ListAuditLogsResult> {
  await connectDB();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (params.adminId) filter.adminId = params.adminId;
  if (params.action) filter.action = params.action;
  if (params.resourceType) filter.resourceType = params.resourceType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs: logs.map((l) => ({
      id: (l as { _id: { toString(): string } })._id.toString(),
      adminId: (l as { adminId: string }).adminId,
      action: (l as { action: string }).action,
      resourceType: (l as { resourceType: string }).resourceType,
      resourceId: (l as { resourceId?: string }).resourceId,
      details: (l as { details?: Record<string, unknown> }).details,
      ipAddress: (l as { ipAddress?: string }).ipAddress,
      userAgent: (l as { userAgent?: string }).userAgent,
      createdAt: (l as { createdAt: Date }).createdAt,
    })),
    total,
    page,
    limit,
  };
}
