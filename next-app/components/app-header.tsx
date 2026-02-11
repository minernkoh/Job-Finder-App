/**
 * Shared app header: logo left; nav right (Browse Jobs and Profile when signed in and not in admin mode; on admin pages, Dashboard / Users / Summaries / Listings). Sign in or UserMenu on the right.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@ui/components";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AuthModalLink } from "@/components/auth-modal-link";
import { BADGE_PILL_ROLE } from "@/lib/badges";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";
import type { AuthUser } from "@/contexts/AuthContext";

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/summaries", label: "Summaries" },
  { href: "/admin/listings", label: "Listings" },
];

export interface AppHeaderProps {
  /** Current user; when null, show Sign in. */
  user: AuthUser | null;
  /** Logout handler for UserMenu. */
  onLogout: () => void;
  /** Extra class for the outer header. */
  className?: string;
}

/** Renders the app nav bar: logo left; when signed in, Browse Jobs and Profile; Sign in or UserMenu right. Active nav link is highlighted. */
export function AppHeader({ user, onLogout, className }: AppHeaderProps) {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isCompare = pathname.startsWith("/browse/compare");
  const isBrowse =
    (pathname === "/browse" || pathname.startsWith("/browse/")) && !isCompare;
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");

  const navLinkClass = (active: boolean) =>
    cn(
      "px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "text-foreground underline decoration-2 decoration-primary underline-offset-8"
        : "rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80 nav-glass",
        PAGE_PX,
        "py-4",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-wrap items-center justify-between gap-2",
          CONTENT_MAX_W,
        )}
      >
        <div className="flex shrink-0 items-center gap-2">
          <Logo className="shrink-0" />
          {isAdmin && user?.role === "admin" && (
            <span
              className={BADGE_PILL_ROLE}
              aria-label="Admin mode"
            >
              Admin
            </span>
          )}
        </div>
        <nav className="flex shrink-0 items-center gap-2">
          {user &&
            isAdmin &&
            adminNavItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={navLinkClass(pathname === href)}
              >
                {label}
              </Link>
            ))}
          {user && !isAdmin && (
            <Link href="/browse" className={navLinkClass(isBrowse)}>
              Browse Jobs
            </Link>
          )}
          {user && !isAdmin && (
            <Link href="/profile" className={navLinkClass(isProfile)}>
              My Profile
            </Link>
          )}
          {user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <Button
              asChild
              variant="default"
              size="xs"
              className="rounded-xl px-4 text-sm"
            >
              <AuthModalLink auth="login">Sign In</AuthModalLink>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
