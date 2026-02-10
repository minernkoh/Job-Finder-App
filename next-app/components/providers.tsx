/**
 * Wraps the app with auth and React Query. Used in the root layout so every page has access to auth and API caching.
 */

"use client";

import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompareProvider } from "@/contexts/CompareContext";

/** Renders children inside QueryClientProvider, AuthProvider, and CompareProvider; mounts auth modal when URL has ?auth=login or ?auth=signup. */
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
        <CompareProvider>
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
          {children}
          <Toaster
            theme="dark"
            richColors
            toastOptions={{
              classNames: {
                toast: "bg-card border-border text-foreground",
                title: "text-foreground",
                description: "text-muted-foreground",
              },
            }}
          />
        </CompareProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
