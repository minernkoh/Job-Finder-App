import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AccessPayload } from "./jwt";

export async function getSession(
  request: NextRequest
): Promise<AccessPayload | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return null;
  return verifyAccessToken(token);
}

/** Returns 401 NextResponse if not authenticated; otherwise returns null (caller proceeds). */
export async function requireAuth(
  request: NextRequest
): Promise<{ payload: AccessPayload } | NextResponse> {
  const payload = await getSession(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { payload };
}

/** Returns 401 or 403 NextResponse if not authorized; otherwise returns { payload }. */
export async function requireAdmin(
  request: NextRequest
): Promise<{ payload: AccessPayload } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
