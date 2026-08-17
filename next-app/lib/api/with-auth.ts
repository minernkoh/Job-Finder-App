/**
 * Wrappers for protected API routes: run connectDB, require auth (or admin), then the handler inside a try/catch.
 * Use to avoid repeating auth checks and error handling across route handlers.
 * Supports both static routes (handler receives request, payload) and dynamic routes (handler receives request, payload, context with params).
 */

import { NextRequest, NextResponse } from "next/server";
import type { AccessPayload } from "@/lib/auth/jwt";
import { requireAuth } from "@/lib/auth/request";
import { requireAdmin } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db";
import { toErrorResponse, aiLockedResponse } from "@/lib/api/errors";
import { User } from "@/lib/models/User";
import { userHasAiAccess } from "@/lib/ai-access";

export type AuthHandler = (
  request: NextRequest,
  payload: AccessPayload
) => Promise<NextResponse>;

/** Context type for dynamic route handlers (e.g. [id], [listingId]). */
export type RouteContext<P = Record<string, string>> = {
  params: Promise<P>;
};

export type AuthHandlerWithParams<P = Record<string, string>> = (
  request: NextRequest,
  payload: AccessPayload,
  context: RouteContext<P>
) => Promise<NextResponse>;

/**
 * Wraps a handler with connectDB, requireAuth, and try/catch. Use for user-authenticated routes.
 * Overload: static routes get (request, payload); dynamic routes get (request, payload, context).
 */
export function withAuth(
  handler: AuthHandler,
  defaultErrorMessage: string
): (request: NextRequest) => Promise<NextResponse>;
export function withAuth<P>(
  handler: AuthHandlerWithParams<P>,
  defaultErrorMessage: string
): (request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>;
export function withAuth<P>(
  handler: AuthHandler | AuthHandlerWithParams<P>,
  defaultErrorMessage: string
): ((request: NextRequest) => Promise<NextResponse>) | ((request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>) {
  return (async (request: NextRequest, context?: RouteContext<P>) => {
    try {
      await connectDB();
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      if (context !== undefined) {
        return await (handler as AuthHandlerWithParams<P>)(request, auth, context);
      }
      return await (handler as AuthHandler)(request, auth);
    } catch (e) {
      return toErrorResponse(e, defaultErrorMessage);
    }
  }) as (request: NextRequest, context?: RouteContext<P>) => Promise<NextResponse>;
}

export type AdminHandlerWithParams<P = Record<string, string>> = (
  request: NextRequest,
  payload: AccessPayload,
  context: RouteContext<P>
) => Promise<NextResponse>;

/**
 * Wraps a handler with connectDB, requireAdmin, and try/catch. Use for admin-only routes.
 * Overload: static routes get (request, payload); dynamic routes get (request, payload, context).
 */
export function withAdmin(
  handler: AuthHandler,
  defaultErrorMessage: string
): (request: NextRequest) => Promise<NextResponse>;
export function withAdmin<P>(
  handler: AdminHandlerWithParams<P>,
  defaultErrorMessage: string
): (request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>;
export function withAdmin<P>(
  handler: AuthHandler | AdminHandlerWithParams<P>,
  defaultErrorMessage: string
): ((request: NextRequest) => Promise<NextResponse>) | ((request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>) {
  return (async (request: NextRequest, context?: RouteContext<P>) => {
    try {
      await connectDB();
      const result = await requireAdmin(request);
      if (result instanceof NextResponse) return result;
      if (context !== undefined) {
        return await (handler as AdminHandlerWithParams<P>)(request, result.payload, context);
      }
      return await (handler as AuthHandler)(request, result.payload);
    } catch (e) {
      return toErrorResponse(e, defaultErrorMessage);
    }
  }) as (request: NextRequest, context?: RouteContext<P>) => Promise<NextResponse>;
}

/**
 * Auth wrapper that also requires AI unlock (User.aiEnabled or admin). Returns 403 AI_LOCKED for preview users.
 */
export function withAiAccess(
  handler: AuthHandler,
  defaultErrorMessage: string,
): (request: NextRequest) => Promise<NextResponse>;
export function withAiAccess<P>(
  handler: AuthHandlerWithParams<P>,
  defaultErrorMessage: string,
): (request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>;
export function withAiAccess<P>(
  handler: AuthHandler | AuthHandlerWithParams<P>,
  defaultErrorMessage: string,
):
  | ((request: NextRequest) => Promise<NextResponse>)
  | ((request: NextRequest, context: RouteContext<P>) => Promise<NextResponse>) {
  return (async (request: NextRequest, context?: RouteContext<P>) => {
    try {
      await connectDB();
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      const user = await User.findById(auth.sub).lean();
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 },
        );
      }
      if (!userHasAiAccess({ role: user.role, aiEnabled: user.aiEnabled })) {
        return aiLockedResponse();
      }
      if (context !== undefined) {
        return await (handler as AuthHandlerWithParams<P>)(request, auth, context);
      }
      return await (handler as AuthHandler)(request, auth);
    } catch (e) {
      return toErrorResponse(e, defaultErrorMessage);
    }
  }) as (request: NextRequest, context?: RouteContext<P>) => Promise<NextResponse>;
}
