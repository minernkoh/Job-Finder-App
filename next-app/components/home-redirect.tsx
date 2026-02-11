/**
 * Client component for the home route: redirects admins to /admin and others to /browse.
 * Preserves search params (auth, redirect) for the auth modal.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/page-state";

interface HomeRedirectProps {
  /** Serialized query string (e.g. auth=login&redirect=%2Fprofile) to append to the target URL. */
  queryString: string;
}

/** Redirects admins to /admin and everyone else to /browse with query params. Shows loading while auth resolves. */
export function HomeRedirect({ queryString }: HomeRedirectProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const base = user?.role === "admin" ? "/admin" : "/browse";
    router.replace(queryString ? `${base}?${queryString}` : base);
  }, [user, isLoading, router, queryString]);

  return <PageLoading fullScreen />;
}
