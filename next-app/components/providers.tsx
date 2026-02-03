/**
 * Wraps the app with auth (and any other global providers). Used in the root layout so every page has access to auth.
 */

"use client";

import { AuthProvider } from "@/contexts/AuthContext";

/** Renders children inside AuthProvider so they can use useAuth() and login/register/logout. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
