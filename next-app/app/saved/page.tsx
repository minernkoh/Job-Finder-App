/**
 * Saved listings page: displays all listings saved by the current user.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@ui/components";
import Link from "next/link";
import { savedListingToListingResult } from "@/lib/api/saved";
import { ListingCard } from "@/components/listing-card";
import { useSavedListings } from "@/hooks/useSavedListings";

/** Inner content: header and saved listings grid. */
function SavedContent() {
  const { user, logout } = useAuth();
  const { savedListings, isLoadingSaved, unsaveMutation } = useSavedListings();

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-4xl items-center justify-between border-b border-border py-4">
        <h1 className="text-xl font-semibold text-foreground">
          My Saved Listings
        </h1>
        <nav className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
          >
            Browse jobs
          </Link>
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Logout
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl py-8">
        {isLoadingSaved && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {!isLoadingSaved && savedListings.length === 0 && (
          <p className="text-muted-foreground">
            You haven&apos;t saved any listings yet.{" "}
            <Link href="/jobs" className="text-primary hover:underline">
              Browse jobs
            </Link>{" "}
            to save your favorites.
          </p>
        )}

        {!isLoadingSaved && savedListings.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedListings.map((s) => (
              <ListingCard
                key={s.id}
                listing={savedListingToListingResult(s)}
                isSaved
                onUnsave={() => unsaveMutation.mutate(s.listingId)}
                onView={() => {}}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/** Saved page: protected. */
export default function SavedPage() {
  return (
    <ProtectedRoute>
      <SavedContent />
    </ProtectedRoute>
  );
}
