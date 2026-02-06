/**
 * Admin audit logs API: GET returns paginated audit log entries with optional filters. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogQuerySchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { listAuditLogs } from "@/lib/services/audit.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns paginated audit logs; optional adminId, action, resourceType. */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const url = new URL(request.url);
    const parsed = AuditLogQuerySchema.safeParse({
      adminId: url.searchParams.get("adminId") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      resourceType: url.searchParams.get("resourceType") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid query");
    const data = await listAuditLogs(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to list audit logs");
  }
}
