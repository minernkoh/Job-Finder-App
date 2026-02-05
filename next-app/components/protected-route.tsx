/**
 * Wraps pages that require login. If the user is not logged in, opens the auth modal on the current page so they can sign in and stay in context.
 */

"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/** Renders children only when the user is logged in; otherwise shows the auth modal on the same page via URL. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const next = new URLSearchParams(searchParams);
      next.set("auth", "login");
      const query = next.toString();
      const url = query ? `${pathname ?? "/jobs"}?${query}` : `${pathname ?? "/jobs"}?auth=login`;
      router.replace(url);
    }
  }, [user, isLoading, pathname, router, searchParams]);

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
