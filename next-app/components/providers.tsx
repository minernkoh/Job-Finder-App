/**
 * Wraps the app with auth and React Query. Used in the root layout so every page has access to auth and API caching.
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { AuthProvider } from "@/contexts/AuthContext";

/** Renders children inside QueryClientProvider and AuthProvider; mounts auth modal when URL has ?auth=login or ?auth=signup. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes for listings
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
