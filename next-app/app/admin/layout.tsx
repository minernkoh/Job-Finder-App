/**
 * Admin layout: when user is admin, shows shared nav (Dashboard, Users, Summaries, etc.). For sub-routes, redirects to /admin if not admin.
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartLineIcon,
  UsersIcon,
  FileTextIcon,
  BriefcaseIcon,
  ChartBarIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: ChartLineIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/summaries", label: "Summaries", icon: FileTextIcon },
  { href: "/admin/listings", label: "Listings", icon: BriefcaseIcon },
  { href: "/admin/analytics", label: "Analytics", icon: ChartBarIcon },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isSubRoute = pathname !== "/admin" && pathname?.startsWith("/admin");

  useEffect(() => {
    if (isLoading) return;
    if (isSubRoute && (!user || user.role !== "admin")) {
      router.replace("/admin");
    }
  }, [isSubRoute, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isSubRoute && (!user || user.role !== "admin")) {
    return null;
  }

  if (user?.role !== "admin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" weight="regular" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
