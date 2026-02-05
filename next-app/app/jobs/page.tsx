/**
 * Jobs page: Search card (What, Country), then results with Filters and listings feed.
 */

"use client";

import {
  ArrowRightIcon,
  BriefcaseIcon,
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
import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  fetchListings,
  recordListingView,
  type ListingsFilters,
} from "@/lib/api/listings";
import { AuthModalLink } from "@/components/auth-modal-link";
import { ListingCard } from "@/components/listing-card";
import { Logo } from "@/components/logo";
import { TrendingListings } from "@/components/trending-listings";
import { UserMenu } from "@/components/user-menu";
import { useSavedListings } from "@/hooks/useSavedListings";
import { JOB_SEARCH_COUNTRIES } from "@/lib/constants/countries";
import { listingsKeys } from "@/lib/query-keys";
import { cn } from "@ui/components/lib/utils";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Relevance" },
  { value: "salary", label: "Salary" },
  { value: "date", label: "Date" },
];

/** Suggested job roles for the search dropdown; filtered by what the user types. */
const SUGGESTED_ROLES: string[] = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "Product Manager",
  "Project Manager",
  "Marketing",
  "Marketing Manager",
  "Remote",
  "DevOps",
  "UX Designer",
  "UI Designer",
  "QA Engineer",
  "Business Analyst",
];

/** Scroll distance in px after which the header switches to sticky condensed mode. */
const SCROLL_THRESHOLD = 64;

/** Inner content: header, search card, trending, and listings grid. */
function JobsContent() {
  const { user, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [country, setCountry] = useState("sg");
  const [locationInput, setLocationInput] = useState("");
  const [page, setPage] = useState(1);
  const [fullTime, setFullTime] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [appliedCountry, setAppliedCountry] = useState("sg");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [appliedFullTime, setAppliedFullTime] = useState(false);
  const [appliedPermanent, setAppliedPermanent] = useState(false);
  const [appliedSalaryMin, setAppliedSalaryMin] = useState("");
  const [appliedSortBy, setAppliedSortBy] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const filters: ListingsFilters = useMemo(() => {
    const f: ListingsFilters = {};
    const where = appliedLocation.trim() || undefined;
    if (where) f.where = where;
    if (appliedFullTime) f.fullTime = true;
    if (appliedPermanent) f.permanent = true;
    const min = parseInt(appliedSalaryMin, 10);
    if (!Number.isNaN(min) && min > 0) f.salaryMin = min;
    if (appliedSortBy) f.sortBy = appliedSortBy;
    return f;
  }, [appliedLocation, appliedFullTime, appliedPermanent, appliedSalaryMin, appliedSortBy]);

  const filteredSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return SUGGESTED_ROLES.slice(0, 10);
    return SUGGESTED_ROLES.filter((role) =>
      role.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [searchInput]);

  /** Copy draft filters to applied and refetch (query key change). */
  const handleApplyFilters = useCallback(() => {
    setAppliedCountry(country);
    setAppliedLocation(locationInput.trim());
    setAppliedFullTime(fullTime);
    setAppliedPermanent(permanent);
    setAppliedSalaryMin(salaryMin);
    setAppliedSortBy(sortBy);
    setPage(1);
  }, [country, locationInput, fullTime, permanent, salaryMin, sortBy]);

  /** Reset draft and applied filters to defaults and refetch. */
  const handleResetFilters = useCallback(() => {
    setCountry("sg");
    setLocationInput("");
    setFullTime(false);
    setPermanent(false);
    setSalaryMin("");
    setSortBy("");
    setAppliedCountry("sg");
    setAppliedLocation("");
    setAppliedFullTime(false);
    setAppliedPermanent(false);
    setAppliedSalaryMin("");
    setAppliedSortBy("");
    setPage(1);
  }, []);

  /** Reset highlighted index when input or filtered list changes. */
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchInput, filteredSuggestions.length]);

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

  /** Toggle sticky header mode when scroll passes threshold. */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Close suggestions dropdown when clicking outside the search wrapper. */
  useEffect(() => {
    if (!suggestionsOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [suggestionsOpen]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: listingsKeys(
      appliedCountry,
      page,
      keyword || undefined,
      Object.keys(filters).length > 0 ? filters : null
    ),
    queryFn: () =>
      fetchListings(
        page,
        keyword || undefined,
        appliedCountry,
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

  const selectSuggestion = useCallback((role: string) => {
    setSearchInput(role);
    setKeyword(role);
    setPage(1);
    setHasSearched(true);
    setSuggestionsOpen(false);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!suggestionsOpen || filteredSuggestions.length === 0) {
        if (e.key === "Escape") setSuggestionsOpen(false);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestionsOpen(false);
        searchInputRef.current?.blur();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) =>
          Math.min(i + 1, filteredSuggestions.length - 1)
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    },
    [
      suggestionsOpen,
      filteredSuggestions,
      highlightedIndex,
      selectSuggestion,
    ]
  );

  const listings = data?.listings ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="min-h-screen p-4">
      <header
        className={
          "sticky top-0 z-50 mx-auto flex flex-wrap items-center gap-4 border-b border-border py-4 transition-all duration-200 " +
          (scrolled
            ? "max-w-4xl rounded-b-xl border-t-0 bg-background/80 px-4 backdrop-blur-md"
            : "max-w-4xl justify-between")
        }
      >
        <Logo className="shrink-0" />
        {scrolled && (
          <form
            onSubmit={handleSearch}
            className="flex min-w-0 flex-1 items-center sm:min-w-[12rem]"
            aria-label="Search jobs (condensed)"
          >
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
              <div className="relative flex min-w-0 flex-1">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  ref={scrolled ? searchInputRef : undefined}
                  type="search"
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
                variant="default"
                size="xs"
                className="h-9 shrink-0 rounded-l-none rounded-r-xl border-0 px-4"
                aria-label="Search"
              >
                Search
              </Button>
            </div>
          </form>
        )}
        <nav className="flex shrink-0 items-center gap-3">
          {user && !scrolled && (
            <Link
              href="/my-jobs"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              My Jobs
            </Link>
          )}
          {user ? (
            <UserMenu user={user} onLogout={logout} />
          ) : scrolled ? (
            <Button
              asChild
              variant="header"
              size="xs"
              className="rounded-xl px-4 text-sm"
            >
              <AuthModalLink auth="login">Sign In</AuthModalLink>
            </Button>
          ) : (
            <Button
              asChild
              variant="default"
              size="xs"
              className="rounded-xl px-4 text-sm"
            >
              <AuthModalLink auth="login">Sign In</AuthModalLink>
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
            <div ref={searchDropdownRef} className="relative flex flex-col">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                <div className="relative flex min-w-0 flex-1">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    ref={scrolled ? undefined : searchInputRef}
                    id="search-what"
                    placeholder="Job title, skills or company"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setSuggestionsOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setSuggestionsOpen(false), 150)
                    }
                    onKeyDown={handleSearchKeyDown}
                    className="h-9 min-w-0 flex-1 rounded-none border-0 border-r-0 bg-transparent pl-10 pr-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Search jobs"
                    aria-expanded={suggestionsOpen}
                    aria-controls="job-suggestions-listbox"
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
                  variant="default"
                  size="xs"
                  className="h-9 shrink-0 rounded-l-none rounded-r-xl border-0 px-4"
                  aria-label="Search"
                >
                  Search
                </Button>
              </div>
              {suggestionsOpen && filteredSuggestions.length > 0 && (
                <div
                  id="job-suggestions-listbox"
                  role="listbox"
                  aria-label="Suggested roles"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg scrollbar-hide"
                >
                  {filteredSuggestions.map((role, i) => (
                    <button
                      key={role}
                      type="button"
                      role="option"
                      aria-selected={highlightedIndex === i}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm rounded-lg",
                        highlightedIndex === i ? "bg-muted" : "hover:bg-muted"
                      )}
                      onClick={() => selectSuggestion(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </section>

        {!hasSearched && user && (
          <section
            aria-label="Empty state"
            className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-6 py-12 text-center"
          >
            <MagnifyingGlassIcon
              className="size-12 text-muted-foreground"
              aria-hidden
            />
            <p className="text-muted-foreground">
              Search for jobs above to get started. Enter a job title, skills,
              or company to find listings.
            </p>
          </section>
        )}

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
                size="default"
                iconRight={<ArrowRightIcon weight="bold" />}
              >
                <AuthModalLink auth="signup" redirect="/jobs">
                  Get Started
                </AuthModalLink>
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
                      onChange={(v) => setSortBy(v)}
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
                      onChange={(v) => setCountry(v)}
                      options={JOB_SEARCH_COUNTRIES.map((c) => ({
                        value: c.code,
                        label: c.label,
                      }))}
                      aria-label="Country"
                      fullWidth={false}
                      className="mt-1 min-w-[8rem]"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="filter-location"
                      className="text-xs text-muted-foreground"
                    >
                      Location
                    </Label>
                    <Input
                      id="filter-location"
                      type="text"
                      placeholder="e.g. Singapore, Central"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="mt-1 w-40"
                      aria-label="Location"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fullTime}
                      onChange={(e) => setFullTime(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Full-time only"
                    />
                    <span className="text-muted-foreground">Full-time</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permanent}
                      onChange={(e) => setPermanent(e.target.checked)}
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
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="mt-1 w-28"
                      aria-label="Minimum salary"
                    />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      aria-label="Reset filters"
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleApplyFilters}
                      aria-label="Apply filters"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
              {listings.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 px-6 py-12 text-center"
                  role="status"
                  aria-label="No results"
                >
                  <BriefcaseIcon
                    className="size-12 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-muted-foreground">
                    No listings match your search.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try different keywords or filters.
                  </p>
                </div>
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
        <TrendingListings />
      </main>
    </div>
  );
}

/** Jobs page: browse listings without login; Log in for save and AI summaries. */
export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsContent />
    </Suspense>
  );
}
