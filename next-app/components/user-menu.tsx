/**
 * UserMenu: circular avatar with user's first initial. Click opens dropdown with Logout; Escape or click outside closes. Accessible aria-expanded and keyboard support.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@ui/components";
import type { AuthUser } from "@/contexts/AuthContext";

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

/** Derives the first letter to show in the avatar (username, then email, else '?'). */
function getInitial(user: AuthUser): string {
  return (
    user.username?.charAt(0)?.toUpperCase() ??
    user.email?.charAt(0)?.toUpperCase() ??
    "?"
  );
}

/** Renders a circular avatar; click opens dropdown with Logout. Escape or click outside closes; aria-expanded reflects open state. */
export function UserMenu({ user, onLogout }: UserMenuProps) {
  const initial = getInitial(user);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  const handleLogout = useCallback(() => {
    close();
    onLogout();
  }, [close, onLogout]);

  return (
    <div
      ref={containerRef}
      className="relative"
      role="group"
      aria-label="User menu"
    >
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`User menu for ${user.username ?? user.email}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initial}
      </button>
      <div
        className={`absolute right-0 top-full z-50 min-w-[120px] rounded-xl border border-border bg-card py-1 shadow-lg [top:calc(100%+4px)] transition-opacity ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="menu"
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-lg px-3 font-normal"
          asChild
          role="menuitem"
        >
          <Link href={user.role === "admin" ? "/admin/settings" : "/profile/settings"} onClick={close}>
            Settings
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-lg px-3 font-normal"
          onClick={handleLogout}
          role="menuitem"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
