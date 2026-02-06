/**
 * Shared app header: logo left; optional back link and title; nav right (Browse Jobs, Profile, Sign in / UserMenu). Ensures consistency across Browse, Profile, Compare, and Job detail pages.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@ui/components";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { AuthModalLink } from "@/components/auth-modal-link";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";
import type { AuthUser } from "@/contexts/AuthContext";

export interface AppHeaderProps {
  /** Optional back link (e.g. /browse with label "Back to browse"). */
  backHref?: string;
  /** Label for the back link. */
  backLabel?: string;
  /** Optional page title shown next to logo (e.g. "Profile", "Compare jobs"). */
  title?: string;
  /** Current user; when null, show Sign in. */
  user: AuthUser | null;
  /** Logout handler for UserMenu. */
  onLogout: () => void;
  /** Extra class for the outer header. */
  className?: string;
}

/** Renders the app nav bar: logo (and optional back + title) left; Browse Jobs, Profile, Sign in / UserMenu right. Active nav link is highlighted. */
export function AppHeader({
  backHref,
  backLabel,
  title,
  user,
  onLogout,
  className,
}: AppHeaderProps) {
  const pathname = usePathname() ?? "";
  const isBrowse = pathname === "/browse" || pathname.startsWith("/browse/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");

  const navLinkClass = (active: boolean) =>
    cn(
      "text-sm underline-offset-4 hover:underline",
      active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background",
        PAGE_PX,
        "py-4",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-wrap items-center justify-between gap-4",
          CONTENT_MAX_W
        )}
      >
        <div className="flex shrink-0 items-center gap-3">
          <Logo className="shrink-0" />
          {backHref && backLabel && (
            <Link
              href={backHref}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {backLabel}
            </Link>
          )}
          {title && (
            <span className="text-muted-foreground" aria-hidden>
              {title}
            </span>
          )}
        </div>
        <nav className="flex shrink-0 items-center gap-3">
          <Link href="/browse" className={navLinkClass(isBrowse)}>
            Browse Jobs
          </Link>
          {user && (
            <Link href="/profile" className={navLinkClass(isProfile)}>
              Profile
            </Link>
          )}
          {user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <Button asChild variant="default" size="xs" className="rounded-xl px-4 text-sm">
              <AuthModalLink auth="login">Sign In</AuthModalLink>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
