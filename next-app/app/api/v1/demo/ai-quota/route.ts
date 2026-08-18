/**
 * GET /api/v1/demo/ai-quota: remaining preview Gemini parse+tailor calls for this IP today.
 */

import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/errors";
import { connectDB } from "@/lib/db";
import { getClientIp } from "@/lib/request-ip";
import { getGuestAiQuota } from "@/lib/services/ai-quota.service";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const data = await getGuestAiQuota(getClientIp(request));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return toErrorResponse(err, "Failed to load preview AI quota");
  }
}
