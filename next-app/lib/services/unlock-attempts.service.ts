/**
 * Unlock-attempt counters for the master-password endpoint (brute-force protection).
 */

import mongoose, { Schema, type Model } from "mongoose";

interface IUnlockAttemptDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  windowStart: Date;
  count: number;
}

const UnlockAttemptSchema = new Schema<IUnlockAttemptDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: false },
);

UnlockAttemptSchema.index({ userId: 1 }, { unique: true });
UnlockAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 60 * 60 });

const UnlockAttempt: Model<IUnlockAttemptDocument> =
  mongoose.models.UnlockAttempt ??
  mongoose.model<IUnlockAttemptDocument>("UnlockAttempt", UnlockAttemptSchema);

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const UNLOCK_RATE_LIMIT_MESSAGE =
  "Too many unlock attempts. Try again in 15 minutes.";

/** Returns true if the user is currently rate-limited for unlock-ai. Increments the counter. */
export async function incrementUnlockAttempts(userId: string): Promise<{
  limited: boolean;
}> {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const doc = await UnlockAttempt.findOne({ userId: uid });
  if (!doc || now.getTime() - doc.windowStart.getTime() > WINDOW_MS) {
    await UnlockAttempt.findOneAndUpdate(
      { userId: uid },
      { $set: { windowStart: now, count: 1 } },
      { upsert: true },
    );
    return { limited: false };
  }
  const next = await UnlockAttempt.findOneAndUpdate(
    { userId: uid },
    { $inc: { count: 1 } },
    { new: true },
  );
  return { limited: (next?.count ?? 0) > MAX_ATTEMPTS };
}
