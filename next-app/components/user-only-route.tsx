/**
 * Wraps user-facing pages (browse, profile, summarize, compare). Redirects admins to /admin.
 * When requireAuth is true, also redirects unauthenticated users to home.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/page-state";

interface UserOnlyRouteProps {
  children: React.ReactNode;
  /** When true, redirect unauthenticated users to home. When false, allow anonymous (only block admins). Default true. */
  requireAuth?: boolean;
}

/** Renders children for non-admin users; redirects admins to /admin. When requireAuth, also redirects unauthenticated users. */
export function UserOnlyRoute({ children, requireAuth = true }: UserOnlyRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (requireAuth && !user) {
      router.replace("/");
      return;
    }
    if (user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, isLoading, router, requireAuth]);

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (user?.role === "admin") {
    return null;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}
