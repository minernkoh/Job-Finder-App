/**
 * Audit log schema: records admin actions (who, what, when, resource, IP, user-agent) for accountability.
 */

import { z } from "zod";

/** Single audit log entry as stored and returned by the API. */
export const AuditLogSchema = z.object({
  adminId: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

/** Query params for listing audit logs (pagination and filters). */
export const AuditLogQuerySchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
