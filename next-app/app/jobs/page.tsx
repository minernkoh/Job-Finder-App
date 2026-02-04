/**
 * Jobs page: Search card (What, Country), then results with Filters and listings feed.
 */

"use client";

import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  SlidersIcon,
  BookmarkIcon,
  SparkleIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
} from "@ui/components";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchListings,
  recordListingView,
  type ListingsFilters,
} from "@/lib/api/listings";
import { ListingCard } from "@/components/listing-card";
import { useSavedListings } from "@/hooks/useSavedListings";
import { JOB_SEARCH_COUNTRIES } from "@/lib/constants/countries";
import { listingsKeys } from "@/lib/query-keys";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Relevance" },
  { value: "salary", label: "Salary" },
  { value: "date", label: "Date" },
];

/** Inner content: header, search card, trending, and listings grid. */
function JobsContent() {
  const { user, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [country, setCountry] = useState("sg");
  const [page, setPage] = useState(1);
  const [fullTime, setFullTime] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filters: ListingsFilters = useMemo(() => {
    const f: ListingsFilters = {};
    if (fullTime) f.fullTime = true;
    if (permanent) f.permanent = true;
    const min = parseInt(salaryMin, 10);
    if (!Number.isNaN(min) && min > 0) f.salaryMin = min;
    if (sortBy) f.sortBy = sortBy;
    return f;
  }, [fullTime, permanent, salaryMin, sortBy]);

  const resetPage = useCallback(() => setPage(1), []);

  /** Focus search when user presses '/' (unless they're typing in an input). */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: listingsKeys(
      country,
      page,
      keyword || undefined,
      Object.keys(filters).length > 0 ? filters : null
    ),
    queryFn: () =>
      fetchListings(
        page,
        keyword || undefined,
        country,
        Object.keys(filters).length > 0 ? filters : undefined
      ),
    enabled: hasSearched,
  });

  const { savedIds, saveMutation, unsaveMutation } = useSavedListings();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setKeyword(searchInput.trim());
      setPage(1);
      setHasSearched(true);
    },
    [searchInput]
  );

  const listings = data?.listings ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-border py-4">
        <h1 className="text-xl font-semibold text-foreground">JobFinder</h1>
        <nav className="flex items-center gap-3">
          {user && (
            <>
              <Link
                href="/jobs"
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Browse
              </Link>
              <Link
                href="/my-jobs"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                My Jobs
              </Link>
            </>
          )}
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <Button
              asChild
              variant="default"
              size="xs"
              className="rounded-xl px-4 text-sm"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 py-8">
        <section
          className="mx-auto max-w-2xl"
          aria-label="Perform a job search"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                <div className="relative flex min-w-0 flex-1">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    ref={searchInputRef}
                    id="search-what"
                    placeholder="Job title, skills or company"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-none border-0 border-r-0 bg-transparent pl-10 pr-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Search jobs"
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
                    aria-hidden
                  >
                    /
                  </span>
                </div>
                <Button
                  type="submit"
                  size="xs"
                  className="h-9 shrink-0 rounded-l-none rounded-r-xl border-0 px-4"
                  aria-label="Search"
                >
                  Search
                </Button>
              </div>
            </div>
          </form>
        </section>

        {!hasSearched && !user && (
          <section
            aria-label="Why sign in"
            className="mx-auto max-w-2xl space-y-6 rounded-xl border border-border bg-muted/40 p-6 text-center shadow-blue ring-1 ring-primary/20 sm:p-8"
          >
            <h2 className="text-2xl font-semibold text-foreground">
              Find your next role,{" "}
              <span className="text-gradient-hero">faster</span>
            </h2>
            <p className="text-base text-muted-foreground">
              Sign to save jobs and get AI summaries for job listings.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card variant="default" className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <BookmarkIcon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground">Save jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    Bookmark listings for later and access them in one place.
                  </p>
                </CardContent>
              </Card>
              <Card variant="default" className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <SparkleIcon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground">AI summaries</h3>
                  <p className="text-sm text-muted-foreground">
                    TLDR, requirements, and SkillsFuture keywords in seconds.
                  </p>
                </CardContent>
              </Card>
              <Card variant="default" className="border-border">
                <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <StackIcon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground">
                    One collection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All saved listings in a single, organized list.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button
                asChild
                variant="cta"
                size="lg"
                iconRight={<ArrowRightIcon weight="bold" />}
              >
                <Link href="/login?redirect=/jobs">Get Started Free</Link>
              </Button>
            </div>
          </section>
        )}

        {hasSearched && isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {hasSearched && isError && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Failed to load listings"}
          </p>
        )}

        {hasSearched && !isLoading && !isError && (
          <>
            <section aria-label="Results" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {totalCount} result{totalCount !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    aria-expanded={filtersOpen}
                    aria-controls="results-filters"
                  >
                    <SlidersIcon className="size-4 shrink-0" />
                    Filters
                  </button>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="results-sort"
                      className="text-xs text-muted-foreground"
                    >
                      Sort by
                    </Label>
                    <Select
                      id="results-sort"
                      value={sortBy}
                      onChange={(v) => {
                        setSortBy(v);
                        resetPage();
                      }}
                      options={SORT_OPTIONS}
                      aria-label="Sort results"
                      fullWidth={false}
                      className="min-w-[8rem]"
                    />
                  </div>
                </div>
              </div>
              {filtersOpen && (
                <div
                  id="results-filters"
                  className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-4"
                  role="region"
                  aria-label="Filters"
                >
                  <div>
                    <Label
                      htmlFor="search-country"
                      className="text-xs text-muted-foreground"
                    >
                      Country
                    </Label>
                    <Select
                      id="search-country"
                      value={country}
                      onChange={(v) => {
                        setCountry(v);
                        resetPage();
                      }}
                      options={JOB_SEARCH_COUNTRIES.map((c) => ({
                        value: c.code,
                        label: c.label,
                      }))}
                      aria-label="Country"
                      fullWidth={false}
                      className="mt-1 min-w-[8rem]"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fullTime}
                      onChange={(e) => {
                        setFullTime(e.target.checked);
                        resetPage();
                      }}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Full-time only"
                    />
                    <span className="text-muted-foreground">Full-time</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permanent}
                      onChange={(e) => {
                        setPermanent(e.target.checked);
                        resetPage();
                      }}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Permanent only"
                    />
                    <span className="text-muted-foreground">Permanent</span>
                  </label>
                  <div>
                    <Label
                      htmlFor="filter-salary"
                      className="text-xs text-muted-foreground"
                    >
                      Min salary
                    </Label>
                    <Input
                      id="filter-salary"
                      type="number"
                      min={0}
                      placeholder="e.g. 50000"
                      value={salaryMin}
                      onChange={(e) => {
                        setSalaryMin(e.target.value);
                        resetPage();
                      }}
                      className="mt-1 w-28"
                      aria-label="Minimum salary"
                    />
                  </div>
                </div>
              )}
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
                        user
                          ? () => unsaveMutation.mutate(listing.id)
                          : undefined
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
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/** Jobs page: browse listings without login; Log in for save and AI summaries. */
export default function JobsPage() {
  return <JobsContent />;
}
