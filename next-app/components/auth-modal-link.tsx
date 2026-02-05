/**
 * AuthModalLink: links that open the auth modal on the current page by adding ?auth=login or ?auth=signup.
 * Preserves existing search params so the user stays in context (e.g. jobs search state).
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export type AuthModalKind = "login" | "signup";

interface AuthModalLinkProps {
  /** Which modal tab to open. */
  auth: AuthModalKind;
  /** Optional path to send the user to after login/signup (defaults to current path). */
  redirect?: string;
  /** Passed to the underlying Link. */
  className?: string;
  /** Link content. */
  children: ReactNode;
}

/** Builds href for current path + existing params + auth (and optional redirect) for modal overlay. */
export function AuthModalLink({ auth, redirect, className, children }: AuthModalLinkProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set("auth", auth);
  if (redirect !== undefined) next.set("redirect", redirect);
  const query = next.toString();
  const href = query ? `${pathname}?${query}` : `${pathname}?auth=${auth}`;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
