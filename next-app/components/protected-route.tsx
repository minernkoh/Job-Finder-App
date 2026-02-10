/**
 * Wraps pages that require login and/or block admins. Single component for auth and user-only routes.
 */

"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/page-state";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, redirect unauthenticated users to home with auth=login. Default true. */
  requireAuth?: boolean;
  /** When true, redirect admin users to /admin (for user-facing pages like browse, profile). Default false. */
  blockAdmins?: boolean;
}

/** Renders children when auth and role conditions pass; otherwise redirects or returns null until redirect. */
export function ProtectedRoute({
  children,
  requireAuth = true,
  blockAdmins = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const redirectPath = pathname + search;

  useEffect(() => {
    if (isLoading) return;
    if (requireAuth && !user) {
      router.replace(`/?auth=login&redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    if (blockAdmins && user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, isLoading, router, requireAuth, blockAdmins, redirectPath]);

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (blockAdmins && user?.role === "admin") {
    return null;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}
