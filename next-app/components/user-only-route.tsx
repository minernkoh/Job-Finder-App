/**
 * Wraps user-facing pages (browse, profile, summarize, compare). Redirects admins to /admin.
 * Thin wrapper around ProtectedRoute with blockAdmins=true.
 */

"use client";

import { ProtectedRoute } from "@/components/protected-route";

interface UserOnlyRouteProps {
  children: React.ReactNode;
  /** When true, redirect unauthenticated users to home. When false, allow anonymous (only block admins). Default true. */
  requireAuth?: boolean;
}

/** Renders children for non-admin users; redirects admins to /admin. When requireAuth, also redirects unauthenticated users. */
export function UserOnlyRoute({
  children,
  requireAuth = true,
}: UserOnlyRouteProps) {
  return (
    <ProtectedRoute blockAdmins requireAuth={requireAuth}>
      {children}
    </ProtectedRoute>
  );
}
