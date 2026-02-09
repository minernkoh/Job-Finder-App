/**
 * Admin export data API: POST exports users, listings, or summaries as JSON. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Listing } from "@/lib/models/Listing";
import { AISummary } from "@/lib/models/AISummary";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";

const ExportBodySchema = z.object({
  type: z.enum(["users", "listings", "summaries"]),
  limit: z.coerce.number().min(1).max(1000).default(500),
});

/** Exports data as JSON. */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request);
    if (result instanceof NextResponse) return result;
    const body = await request.json();
    const parsed = ExportBodySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error, "Invalid input");
    await connectDB();
    const { type, limit } = parsed.data;
    let data: unknown;
    if (type === "users") {
      const users = await User.find({}).select("-password").limit(limit).lean();
      data = users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: (u as { status?: string }).status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
    } else if (type === "listings") {
      const listings = await Listing.find({}).limit(limit).lean();
      data = listings.map((l) => ({
        id: l._id.toString(),
        title: l.title,
        company: l.company,
        location: l.location,
        country: l.country,
        sourceId: l.sourceId,
        createdAt: l.createdAt,
      }));
    } else {
      const summaries = await AISummary.find({}).limit(limit).lean();
      data = summaries.map((s) => ({
        id: s._id.toString(),
        userId: s.userId.toString(),
        tldr: s.tldr,
        createdAt: s.createdAt,
      }));
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e, "Export failed");
  }
}
