/**
 * Admin system settings API: GET returns current settings; PATCH updates (partial). Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { SystemSettingsUpdateSchema } from "@schemas";
import { requireAdmin } from "@/lib/auth/guard";
import { getSystemSettings, updateSystemSettings } from "@/lib/services/admin-system.service";
import { logAudit } from "@/lib/services/audit.service";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

/** Returns current system settings (no secrets). */
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const data = await getSystemSettings();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to get settings");
  }
}

/** Updates system settings (partial); audits the action. */
export async function PATCH(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const { payload } = result;
    const body = await request.json();
    const parsed = SystemSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    const data = await updateSystemSettings(parsed.data, payload.sub);
    await logAudit(request, payload, {
      action: "update",
      resourceType: "system_settings",
      details: { updated: Object.keys(parsed.data) },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Failed to update settings");
  }
}
