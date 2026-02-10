/**
 * Admin summaries service: list all summaries with optional user filter and pagination; delete summary by id.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { calculatePagination } from "@/lib/pagination";
import { isValidObjectId, parseObjectId } from "@/lib/objectid";
import { AISummary } from "@/lib/models/AISummary";
import { User } from "@/lib/models/User";

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
    userName: string;
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
  const { page, limit, skip } = calculatePagination(params);
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

  const userIds = [
    ...new Set(
      summaries.map((s) => String((s as { userId: mongoose.Types.ObjectId }).userId))
    ),
  ].filter(Boolean);
  const userIdObjList = userIds
    .map((id) => parseObjectId(id))
    .filter((id): id is mongoose.Types.ObjectId => id != null);
  const userDocs =
    userIdObjList.length > 0
      ? await User.find({ _id: { $in: userIdObjList } })
          .select("username")
          .lean()
      : [];
  const usernameByUserId = new Map<string, string>();
  for (const u of userDocs) {
    const id = (u as { _id: mongoose.Types.ObjectId })._id.toString();
    const uname = (u as { username: string }).username;
    usernameByUserId.set(id, uname);
  }

  return {
    summaries: summaries.map((s) => {
      const uid = String((s as { userId: mongoose.Types.ObjectId }).userId);
      return {
        id: (s as { _id: mongoose.Types.ObjectId })._id.toString(),
        userId: uid,
        userName: usernameByUserId.get(uid) ?? "",
        tldr: (s as { tldr: string }).tldr,
        createdAt: (s as { createdAt: Date }).createdAt,
        hasSalarySgd: !!(s as { salarySgd?: string }).salarySgd,
        hasJdMatch: !!(s as { jdMatch?: unknown }).jdMatch,
      };
    }),
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
