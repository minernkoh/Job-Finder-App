/**
 * POST /api/v1/auth/unlock-ai: compare a master password to AI_ACCESS_SECRET and set user.aiEnabled.
 */

import { createHash, timingSafeEqual } from "crypto";
import { UnlockAiBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, validationErrorResponse } from "@/lib/api/errors";
import { withAuth } from "@/lib/api/with-auth";
import { getEnv } from "@/lib/env";
import { User } from "@/lib/models/User";
import { serializeUser } from "@/lib/user-serializer";
import {
  incrementUnlockAttempts,
  UNLOCK_RATE_LIMIT_MESSAGE,
} from "@/lib/services/unlock-attempts.service";

function secretsEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function postUnlockAiHandler(
  request: NextRequest,
  payload: { sub: string; role: string },
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.AI_ACCESS_SECRET) {
    return NextResponse.json(
      { success: false, message: "AI access is not configured" },
      { status: 503 },
    );
  }

  const { limited } = await incrementUnlockAttempts(payload.sub);
  if (limited) {
    return NextResponse.json(
      { success: false, message: UNLOCK_RATE_LIMIT_MESSAGE },
      { status: 429 },
    );
  }

  const [body, parseError] = await parseJsonBody(request);
  if (parseError) return parseError;
  const parsed = UnlockAiBodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid body");

  if (!secretsEqual(parsed.data.password, env.AI_ACCESS_SECRET)) {
    return NextResponse.json(
      { success: false, message: "Invalid access code" },
      { status: 403 },
    );
  }

  const user = await User.findByIdAndUpdate(
    payload.sub,
    { $set: { aiEnabled: true } },
    { new: true },
  ).lean();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: serializeUser(user, { timestamps: false }),
  });
}

export const POST = withAuth(postUnlockAiHandler, "Failed to unlock AI");
