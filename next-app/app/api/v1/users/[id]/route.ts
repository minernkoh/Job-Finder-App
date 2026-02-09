/**
 * User by ID API: GET returns one user (own profile or admin); PATCH updates user (own profile or admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { UserUpdateSchema } from "@schemas";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { requireAuth } from "@/lib/auth/request";
import { isValidObjectId } from "@/lib/objectid";

/** Returns user if requester is the user or admin; otherwise 403. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const payload = auth;

    const { id } = await params;
    const isOwn = payload.sub === id;
    const isAdmin = payload.role === "admin";
    if (!isOwn && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user id" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        username: (user as { username?: string }).username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (e) {
    return toErrorResponse(e, "Failed to get user");
  }
}

/** Updates user if requester is the user or admin; duplicate email or username returns 409. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const payload = auth;

    const { id } = await params;
    const isOwn = payload.sub === id;
    const isAdmin = payload.role === "admin";
    if (!isOwn && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (parsed.data.email !== undefined) {
      const existing = await User.findOne({
        email: parsed.data.email,
        role: user.role,
      }).lean();
      if (existing && existing._id.toString() !== id) {
        return NextResponse.json(
          { success: false, message: "Email already in use" },
          { status: 409 }
        );
      }
      user.email = parsed.data.email;
    }
    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.username !== undefined) {
      const trimmed = parsed.data.username.trim();
      if (trimmed) {
        const existingByUsername = await User.findOne({
          username: trimmed,
          _id: { $ne: id },
        }).lean();
        if (existingByUsername) {
          return NextResponse.json(
            { success: false, message: "Username already taken" },
            { status: 409 }
          );
        }
        user.username = trimmed;
      } else {
        user.username = undefined;
      }
    }
    if (parsed.data.password !== undefined)
      user.password = parsed.data.password;

    await user.save();

    const updated = await User.findById(id).select("-password").lean();
    return NextResponse.json({
      success: true,
      data: {
        id: updated!._id.toString(),
        name: updated!.name,
        email: updated!.email,
        role: updated!.role,
        username: (updated as { username?: string }).username,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      },
    });
  } catch (e) {
    return toErrorResponse(e, "Failed to update user");
  }
}
