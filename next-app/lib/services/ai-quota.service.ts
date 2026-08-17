/**
 * Per-user daily Gemini quota. Cached AI hits should not call consumeAiQuota.
 */

import mongoose, { Schema, type Model } from "mongoose";
import { getEnv } from "@/lib/env";
import { AI_QUOTA_MESSAGE } from "@/lib/ai-access";

export class AiQuotaExceededError extends Error {
  constructor(message = AI_QUOTA_MESSAGE) {
    super(message);
    this.name = "AiQuotaExceededError";
  }
}

interface IAiUsageDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  day: string;
  totalCalls: number;
  tailorCalls: number;
}

const AiUsageSchema = new Schema<IAiUsageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    totalCalls: { type: Number, default: 0 },
    tailorCalls: { type: Number, default: 0 },
  },
  { timestamps: false },
);

AiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

const AiUsage: Model<IAiUsageDocument> =
  mongoose.models.AiUsage ?? mongoose.model<IAiUsageDocument>("AiUsage", AiUsageSchema);

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export type AiQuotaKind = "general" | "tailor";

/**
 * Increments today's quota for the user. Throws AiQuotaExceededError when over limit.
 * Call only immediately before a Gemini request, never on a cache hit.
 */
export async function consumeAiQuota(
  userId: string,
  kind: AiQuotaKind = "general",
): Promise<void> {
  const env = getEnv();
  const day = utcDay();
  const uid = new mongoose.Types.ObjectId(userId);
  const inc: { totalCalls: number; tailorCalls?: number } = { totalCalls: 1 };
  if (kind === "tailor") inc.tailorCalls = 1;

  const doc = await AiUsage.findOneAndUpdate(
    { userId: uid, day },
    { $inc: inc, $setOnInsert: { userId: uid, day } },
    { upsert: true, new: true },
  );

  const overTotal = doc.totalCalls > env.AI_DAILY_LIMIT;
  const overTailor = kind === "tailor" && doc.tailorCalls > env.AI_TAILOR_DAILY_LIMIT;
  if (overTotal || overTailor) {
    const revert: { totalCalls: number; tailorCalls?: number } = { totalCalls: -1 };
    if (kind === "tailor") revert.tailorCalls = -1;
    await AiUsage.updateOne({ _id: doc._id }, { $inc: revert });
    throw new AiQuotaExceededError();
  }
}

export function isAiQuotaExceededError(err: unknown): boolean {
  return err instanceof AiQuotaExceededError || (err instanceof Error && err.name === "AiQuotaExceededError");
}
