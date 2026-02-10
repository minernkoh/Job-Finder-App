/**
 * Admin users service: list users with filters/pagination, get user detail with activity counts, create user, update email/username, update role/status, delete user with safeguards.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { calculatePagination } from "@/lib/pagination";
import { isValidObjectId } from "@/lib/objectid";
import { User } from "@/lib/models/User";
import { AISummary } from "@/lib/models/AISummary";
import { SavedListing } from "@/lib/models/SavedListing";
import type { UserRole } from "@schemas";
import type { UserStatus } from "@schemas";
import type { AdminCreateUserBody } from "@schemas";
import type { AdminUpdateUserBody } from "@schemas";

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
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** Paginated list of users with optional search (username/email) and filters (role, status). */
export async function listUsers(
  params: ListUsersParams,
): Promise<ListUsersResult> {
  await connectDB();
  const { page, limit, skip } = calculatePagination(params);

  const filter: mongoose.FilterQuery<{
    email: string;
    username: string;
    role: string;
    status?: string;
  }> = {};
  if (params.role) filter.role = params.role;
  if (params.status) filter.status = params.status;
  if (params.search?.trim()) {
    const term = params.search.trim();
    filter.$or = [
      { username: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      username: u.username,
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
  email: string;
  username: string;
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
export async function getUserDetail(
  userId: string,
): Promise<UserDetailResult | null> {
  await connectDB();
  if (!isValidObjectId(userId)) return null;

  const user = await User.findById(userId).select("-password").lean();
  if (!user) return null;

  const id = new mongoose.Types.ObjectId(userId);
  const [summaryCount, savedCount, lastSummary, lastSaved] = await Promise.all([
    AISummary.countDocuments({ userId: id }),
    SavedListing.countDocuments({ userId: id }),
    AISummary.findOne({ userId: id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean(),
    SavedListing.findOne({ userId: id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean(),
  ]);

  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
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

/** Create a new user (admin-only). Password is hashed by User model pre-save. Returns new user or duplicate email/username reason. */
export async function createUser(
  body: AdminCreateUserBody,
): Promise<
  | {
      success: true;
      user: { id: string; email: string; username: string; role: string };
    }
  | { success: false; reason: string }
> {
  await connectDB();
  const targetRole = body.role ?? "user";
  const existing = await User.findOne({
    email: body.email,
    role: targetRole,
  }).lean();
  if (existing) {
    return { success: false, reason: "Email already registered for this role" };
  }
  const usernameTrimmed = body.username.trim();
  const existingUsername = await User.findOne({
    username: usernameTrimmed,
  }).lean();
  if (existingUsername) {
    return { success: false, reason: "Username already taken" };
  }
  const user = await User.create(body);
  return {
    success: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
}

/** Update user email and/or username (admin-only). */
export async function updateUserProfile(
  userId: string,
  body: AdminUpdateUserBody,
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }
  const user = await User.findById(userId);
  if (!user) return { success: false, reason: "User not found" };
  if (body.email != null) {
    const existing = await User.findOne({
      email: body.email,
      role: user.role,
      _id: { $ne: userId },
    }).lean();
    if (existing)
      return { success: false, reason: "Email already in use for this role" };
    user.email = body.email;
  }
  if (body.username !== undefined) {
    const trimmed = body.username.trim();
    if (!trimmed) {
      return {
        success: false,
        reason: "Username is required and cannot be cleared",
      };
    }
    const existingUsername = await User.findOne({
      username: trimmed,
      _id: { $ne: userId },
    }).lean();
    if (existingUsername)
      return { success: false, reason: "Username already taken" };
    user.username = trimmed;
  }
  await user.save();
  return { success: true };
}

/** Update user role; throws if demoting last admin. */
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!isValidObjectId(userId)) {
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
  status: UserStatus,
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!isValidObjectId(userId)) {
    return { success: false, reason: "Invalid user id" };
  }

  const user = await User.findById(userId);
  if (!user) return { success: false, reason: "User not found" };

  const doc = user as mongoose.Document & { status?: string };
  doc.status = status;
  await user.save();
  return { success: true };
}

/** Delete user; allows self-delete. Rejects if last admin. Cascades: delete AISummary, SavedListing, UserProfile, User. */
export async function deleteUser(
  userId: string,
): Promise<{ success: false; reason: string } | { success: true }> {
  await connectDB();
  if (!isValidObjectId(userId)) {
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
