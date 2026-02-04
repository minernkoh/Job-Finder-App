/**
 * UserMenu: circular avatar with user's first initial. On hover or focus, a dropdown appears with the Logout action.
 */

"use client";

import { Button } from "@ui/components";
import type { AuthUser } from "@/contexts/AuthContext";

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

/** Derives the first letter to show in the avatar (name, then email, else '?'). */
function getInitial(user: AuthUser): string {
  return (
    user.name?.charAt(0)?.toUpperCase() ??
    user.email?.charAt(0)?.toUpperCase() ??
    "?"
  );
}

/** Renders a circular avatar showing the user's initial; hover reveals a dropdown with Logout. */
export function UserMenu({ user, onLogout }: UserMenuProps) {
  const initial = getInitial(user);

  return (
    <div className="relative group" role="group" aria-label="User menu">
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label={`User menu for ${user.name ?? user.email}`}
      >
        {initial}
      </button>
      <div
        className="pointer-events-none absolute right-0 top-full z-50 min-w-[120px] rounded-xl border border-border bg-card py-1 shadow-lg opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [top:calc(100%-4px)]"
        role="menu"
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-lg px-3 font-normal"
          onClick={onLogout}
          role="menuitem"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
