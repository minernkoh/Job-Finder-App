/**
 * Jobs page: browse job listings with keyword search and country filter. Shows trending section and listings feed.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { Button, Input } from "@ui/components";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import Link from "next/link";
import { fetchListings, recordListingView } from "@/lib/api/listings";
import { ListingCard } from "@/components/listing-card";
import { TrendingListings } from "@/components/trending-listings";
import { useSavedListings } from "@/hooks/useSavedListings";
import { JOB_SEARCH_COUNTRIES } from "@/lib/constants/countries";
import { listingsKeys } from "@/lib/query-keys";

/** Inner content: header, search, trending, and listings grid. */
function JobsContent() {
  const { user, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [country, setCountry] = useState("sg");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: listingsKeys(country, page, keyword || undefined),
    queryFn: () => fetchListings(page, keyword || undefined, country),
  });

  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setKeyword(searchInput.trim());
      setPage(1);
    },
    [searchInput]
  );

  const listings = data?.listings ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-border py-4">
        <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
        <nav className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Browse
          </Link>
          <Link
            href="/saved"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
          >
            Saved
          </Link>
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Logout
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 py-8">
        <TrendingListings />

        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by keyword..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs flex-1"
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {JOB_SEARCH_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <Button type="submit">Search</Button>
        </form>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Failed to load listings"}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            <p className="text-sm text-muted-foreground">
              {totalCount} result{totalCount !== 1 ? "s" : ""}
            </p>
            {listings.length === 0 ? (
              <p className="text-muted-foreground">
                No listings match your search.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSaved={savedIds.has(listing.id)}
                    onView={() => recordListingView(listing.id)}
                    onSave={
                      user ? () => saveMutation.mutate(listing) : undefined
                    }
                    onUnsave={
                      user ? () => unsaveMutation.mutate(listing.id) : undefined
                    }
                  />
                ))}
              </div>
            )}
            {listings.length >= 20 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Jobs page: protected, requires login. */
export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsContent />
    </ProtectedRoute>
  );
}
