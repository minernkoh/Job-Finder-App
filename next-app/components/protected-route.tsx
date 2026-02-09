/**
 * Wraps pages that require login. If the user is not logged in, redirects to the homepage so protected URLs (e.g. /profile?auth=login) are never used.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/page-state";

/** Renders children only when the user is logged in; otherwise redirects to the homepage. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/");
  }, [user, isLoading, router]);

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
