/**
 * Admin summaries service: list all summaries with optional user filter and pagination; delete summary by id.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { isValidObjectId, parseObjectId } from "@/lib/objectid";
import { AISummary } from "@/lib/models/AISummary";

export interface ListSummariesParams {
  userId?: string;
  page?: number;
  limit?: number;
  sort?: "createdAt" | "-createdAt";
}

export interface ListSummariesResult {
  summaries: Array<{
    id: string;
    userId: string;
    tldr: string;
    createdAt: Date;
    hasSalarySgd: boolean;
    hasJdMatch: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of AI summaries; optional filter by userId. */
export async function listSummaries(
  params: ListSummariesParams
): Promise<ListSummariesResult> {
  await connectDB();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const sortKey =
    params.sort === "-createdAt"
      ? { createdAt: -1 as const }
      : { createdAt: 1 as const };

  const filter: mongoose.FilterQuery<{ userId: unknown }> = {};
  const userIdObj = parseObjectId(params.userId?.trim());
  if (userIdObj) filter.userId = userIdObj;

  const [summaries, total] = await Promise.all([
    AISummary.find(filter).sort(sortKey).skip(skip).limit(limit).lean(),
    AISummary.countDocuments(filter),
  ]);

  return {
    summaries: summaries.map((s) => ({
      id: (s as { _id: mongoose.Types.ObjectId })._id.toString(),
      userId: String((s as { userId: mongoose.Types.ObjectId }).userId),
      tldr: (s as { tldr: string }).tldr,
      createdAt: (s as { createdAt: Date }).createdAt,
      hasSalarySgd: !!(s as { salarySgd?: string }).salarySgd,
      hasJdMatch: !!(s as { jdMatch?: unknown }).jdMatch,
    })),
    total,
    page,
    limit,
  };
}

/** Deletes a summary by id; returns true if deleted, false if not found. */
export async function deleteSummary(summaryId: string): Promise<boolean> {
  await connectDB();
  if (!isValidObjectId(summaryId)) return false;
  const result = await AISummary.findByIdAndDelete(summaryId);
  return result != null;
}
