/**
 * Per-user daily Gemini quota. Cached AI hits should not call consumeAiQuota.
 */

import mongoose, { Schema, type Model } from "mongoose";
import { createHash } from "crypto";
import { getEnv } from "@/lib/env";
import { AI_QUOTA_MESSAGE, GUEST_AI_QUOTA_MESSAGE } from "@/lib/ai-access";

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

interface IGuestAiUsageDocument {
  _id: mongoose.Types.ObjectId;
  guestKey: string;
  day: string;
  totalCalls: number;
}

const GuestAiUsageSchema = new Schema<IGuestAiUsageDocument>(
  {
    guestKey: { type: String, required: true },
    day: { type: String, required: true },
    totalCalls: { type: Number, default: 0 },
  },
  { timestamps: false },
);

GuestAiUsageSchema.index({ guestKey: 1, day: 1 }, { unique: true });

const GuestAiUsage: Model<IGuestAiUsageDocument> =
  mongoose.models.GuestAiUsage ??
  mongoose.model<IGuestAiUsageDocument>("GuestAiUsage", GuestAiUsageSchema);

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashGuestKey(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export type AiQuotaKind = "general" | "tailor";

export type GuestAiQuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
};

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

/**
 * Increments today's preview Gemini quota for an IP. Throws AiQuotaExceededError when over AI_GUEST_DAILY_LIMIT.
 * Call only immediately before a Gemini request, never on a cache hit.
 */
export async function consumeGuestAiQuota(ip: string): Promise<void> {
  const env = getEnv();
  const day = utcDay();
  const guestKey = hashGuestKey(ip);
  const limit = env.AI_GUEST_DAILY_LIMIT;

  const doc = await GuestAiUsage.findOneAndUpdate(
    { guestKey, day },
    { $inc: { totalCalls: 1 }, $setOnInsert: { guestKey, day } },
    { upsert: true, new: true },
  );

  if (doc.totalCalls > limit) {
    await GuestAiUsage.updateOne({ _id: doc._id }, { $inc: { totalCalls: -1 } });
    throw new AiQuotaExceededError(GUEST_AI_QUOTA_MESSAGE);
  }
}

/** Returns today's used/limit/remaining preview Gemini quota for an IP. Does not increment. */
export async function getGuestAiQuota(ip: string): Promise<GuestAiQuotaSnapshot> {
  const env = getEnv();
  const day = utcDay();
  const guestKey = hashGuestKey(ip);
  const limit = env.AI_GUEST_DAILY_LIMIT;
  const doc = await GuestAiUsage.findOne({ guestKey, day }).lean();
  const used = doc?.totalCalls ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function isAiQuotaExceededError(err: unknown): boolean {
  return err instanceof AiQuotaExceededError || (err instanceof Error && err.name === "AiQuotaExceededError");
}
