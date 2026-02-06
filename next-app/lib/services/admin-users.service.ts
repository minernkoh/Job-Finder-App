/**
 * Admin users service: list users with filters/pagination, get user detail with activity counts, update role/status, delete user with safeguards.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import type { UserRole } from "@schemas";
import type { UserStatus } from "@schemas";

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface ListUsersResult {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of users with optional search (name/email) and filters (role, status). */
export async function listUsers(
  params: ListUsersParams
): Promise<ListUsersResult> {
  await connectDB();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter: mongoose.FilterQuery<{ name: string; email: string; role: string; status?: string }> = {};
  if (params.role) filter.role = params.role;
  if (params.status) filter.status = params.status;
  if (params.search?.trim()) {
    const term = params.search.trim();
    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: (u as { status?: string }).status ?? "active",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    total,
    page,
    limit,
  };
}

export interface UserDetailResult {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  summaryCount: number;
  savedCount: number;
  lastSummaryAt?: Date;
  lastSavedAt?: Date;
}

/** User by id with summary count, saved count, and last activity timestamps. */
export async function getUserDetail(userId: string): Promise<UserDetailResult | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const user = await User.findById(userId).select("-password").lean();
  if (!user) return null;

  const id = new mongoose.Types.ObjectId(userId);
  const [summaryCount, savedCount, lastSummary, lastSaved] = await Promise.all([
    AISummary.countDocuments({ userId: id }),
    SavedListing.countDocuments({ userId: id }),
    AISummary.findOne({ userId: id }).sort({ createdAt: -1 }).select("createdAt").lean(),
    SavedListing.findOne({ userId: id }).sort({ createdAt: -1 }).select("createdAt").lean(),
  ]);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: (user as { status?: string }).status ?? "active",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    summaryCount,
    savedCount,
    lastSummaryAt: lastSummary?.createdAt,
    lastSavedAt: lastSaved?.createdAt,
  };
}

/** Count admins (for last-admin safeguard). */
export async function countAdmins(): Promise<number> {
  await connectDB();
  return User.countDocuments({ role: "admin" });
}

/** Update user role; throws if demoting last admin. */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, reason: "Invalid user id" };
  }

  const user = await User.findById(userId);
  if (!user) return { success: false, reason: "User not found" };

  if (user.role === "admin" && role === "user") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return { success: false, reason: "Cannot demote the last admin" };
    }
  }

  user.role = role;
  await user.save();
  return { success: true };
}

/** Update user status (active/suspended). */
export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, reason: "Invalid user id" };
  }

  const user = await User.findById(userId);
  if (!user) return { success: false, reason: "User not found" };

  const doc = user as mongoose.Document & { status?: string };
  doc.status = status;
  await user.save();
  return { success: true };
}

/** Delete user; throws if self-delete or last admin. Cascades: delete AISummary, SavedListing, UserProfile for this user. */
export async function deleteUser(
  userId: string,
  adminId: string
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (userId === adminId) {
    return { success: false, reason: "Cannot delete your own account" };
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, reason: "Invalid user id" };
  }

  const user = await User.findById(userId);
  if (!user) return { success: false, reason: "User not found" };
  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return { success: false, reason: "Cannot delete the last admin" };
    }
  }

  const id = new mongoose.Types.ObjectId(userId);
  const { UserProfile } = await import("@/lib/models/UserProfile");
  await Promise.all([
    AISummary.deleteMany({ userId: id }),
    SavedListing.deleteMany({ userId: id }),
    UserProfile.deleteMany({ userId: id }),
    User.findByIdAndDelete(userId),
  ]);
  return { success: true };
}
