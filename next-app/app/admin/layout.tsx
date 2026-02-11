/**
 * Admin layout: when user is admin, shows AppHeader (which includes admin nav in the header) and main content. For sub-routes, redirects to /admin if not admin.
 */

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-state";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const isSubRoute = pathname !== "/admin" && pathname?.startsWith("/admin");

  useEffect(() => {
    if (isLoading) return;
    if (isSubRoute && (!user || user.role !== "admin")) {
      router.replace("/admin");
    }
  }, [isSubRoute, user, isLoading, router]);

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (isSubRoute && (!user || user.role !== "admin")) {
    return null;
  }

  if (user?.role !== "admin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={logout} />
      <main
        id="main-content"
        className={cn("mx-auto py-8", CONTENT_MAX_W, PAGE_PX)}
      >
        {children}
      </main>
    </div>
  );
}
