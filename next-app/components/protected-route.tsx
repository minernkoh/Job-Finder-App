/**
 * Wraps pages that require login. If the user is not logged in, redirects to home with the auth modal open and saves the current URL so they can be sent back after logging in.
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** Renders children only when the user is logged in; otherwise redirects to login with a return URL. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname ?? "/jobs");
      window.location.href = `/?auth=login&redirect=${redirect}`;
    }
  }, [user, isLoading, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
