/**
 * Browse jobs page: Search card (What, Country), then results with Filters and listings feed.
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
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchListings,
  fetchTrending,
  fetchRecommendedListings,
  recordListingView,
  type ListingsFilters,
} from "@/lib/api/listings";
import { AuthModalLink } from "@/components/auth-modal-link";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { ListingCard } from "@/components/listing-card";
import { ListingSection } from "@/components/listing-section";
import { useCompare } from "@/contexts/CompareContext";
import { useSavedListings } from "@/hooks/useSavedListings";
import { JOB_SEARCH_COUNTRIES } from "@/lib/constants/countries";
import {
  CARD_PADDING_COMPACT,
  CARD_PADDING_HERO,
  CONTENT_MAX_W,
  EMPTY_STATE_PADDING,
  GAP_MD,
  PAGE_PX,
  SECTION_GAP,
} from "@/lib/layout";
import { listingsKeys, trendingKeys, recommendedKeys } from "@/lib/query-keys";
import { cn } from "@ui/components/lib/utils";
import { SORT_BY_OPTIONS } from "@/lib/constants/listings";

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

/** Inner content: shared header, search below nav, compare bar, then split layout when results exist. */
function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { compareSet, addToCompare, isInCompareSet } = useCompare();
  const selectedJobId = searchParams?.get("job") ?? null;

  const hasSearchInUrl = !!(
    searchParams?.get("job") || searchParams?.get("keyword")
  );
  const kw = hasSearchInUrl ? (searchParams?.get("keyword") ?? "") : "";
  const countryParam = hasSearchInUrl
    ? (searchParams?.get("country") ?? "sg")
    : "sg";
  const pageParam = hasSearchInUrl ? searchParams?.get("page") : null;
  const pageNum =
    pageParam != null ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const where = hasSearchInUrl ? (searchParams?.get("where") ?? "") : "";
  const fullTimeParam = hasSearchInUrl && searchParams?.get("fullTime") === "1";
  const permanentParam =
    hasSearchInUrl && searchParams?.get("permanent") === "1";
  const salaryMinParam = hasSearchInUrl
    ? (searchParams?.get("salaryMin") ?? "")
    : "";
  const sortByParam = hasSearchInUrl ? (searchParams?.get("sortBy") ?? "") : "";

  const [keyword, setKeyword] = useState(hasSearchInUrl ? kw : "");
  const [searchInput, setSearchInput] = useState(hasSearchInUrl ? kw : "");
  const [country, setCountry] = useState(hasSearchInUrl ? countryParam : "sg");
  const [locationInput, setLocationInput] = useState(
    hasSearchInUrl ? where : "",
  );
  const [page, setPage] = useState(hasSearchInUrl ? pageNum : 1);
  const [fullTime, setFullTime] = useState(
    hasSearchInUrl ? fullTimeParam : false,
  );
  const [permanent, setPermanent] = useState(
    hasSearchInUrl ? permanentParam : false,
  );
  const [salaryMin, setSalaryMin] = useState(
    hasSearchInUrl ? salaryMinParam : "",
  );
  const [sortBy, setSortBy] = useState(hasSearchInUrl ? sortByParam : "");
  const [appliedCountry, setAppliedCountry] = useState(
    hasSearchInUrl ? countryParam : "sg",
  );
  const [appliedLocation, setAppliedLocation] = useState(
    hasSearchInUrl ? where : "",
  );
  const [appliedFullTime, setAppliedFullTime] = useState(
    hasSearchInUrl ? fullTimeParam : false,
  );
  const [appliedPermanent, setAppliedPermanent] = useState(
    hasSearchInUrl ? permanentParam : false,
  );
  const [appliedSalaryMin, setAppliedSalaryMin] = useState(
    hasSearchInUrl ? salaryMinParam : "",
  );
  const [appliedSortBy, setAppliedSortBy] = useState(
    hasSearchInUrl ? sortByParam : "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(hasSearchInUrl);
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
  }, [
    appliedLocation,
    appliedFullTime,
    appliedPermanent,
    appliedSalaryMin,
    appliedSortBy,
  ]);

  const filteredSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return SUGGESTED_ROLES.slice(0, 10);
    return SUGGESTED_ROLES.filter((role) =>
      role.toLowerCase().includes(q),
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

  const updateSearchInput = useCallback((value: string) => {
    setSearchInput(value);
    setHighlightedIndex(0);
  }, []);

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
  }, [updateSearchInput]);

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
      Object.keys(filters).length > 0 ? filters : null,
    ),
    queryFn: () =>
      fetchListings(
        page,
        keyword || undefined,
        appliedCountry,
        Object.keys(filters).length > 0 ? filters : undefined,
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
    [searchInput],
  );

  const selectSuggestion = useCallback(
    (role: string) => {
      updateSearchInput(role);
      setKeyword(role);
      setPage(1);
      setHasSearched(true);
      setSuggestionsOpen(false);
    },
    [updateSearchInput],
  );

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
          Math.min(i + 1, filteredSuggestions.length - 1),
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
    [suggestionsOpen, filteredSuggestions, highlightedIndex, selectSuggestion],
  );

  const listings = data?.listings ?? [];
  const totalCount = data?.totalCount ?? 0;

  /** Build /browse?job=id&... from current search and filters for split-panel selection. */
  const buildJobHref = useCallback(
    (listingId: string) => {
      const params = new URLSearchParams();
      params.set("job", listingId);
      if (keyword) params.set("keyword", keyword);
      params.set("country", appliedCountry);
      params.set("page", String(page));
      if (appliedLocation) params.set("where", appliedLocation);
      if (appliedFullTime) params.set("fullTime", "1");
      if (appliedPermanent) params.set("permanent", "1");
      if (appliedSalaryMin) params.set("salaryMin", appliedSalaryMin);
      if (appliedSortBy) params.set("sortBy", appliedSortBy);
      return `/browse?${params.toString()}`;
    },
    [
      keyword,
      appliedCountry,
      page,
      appliedLocation,
      appliedFullTime,
      appliedPermanent,
      appliedSalaryMin,
      appliedSortBy,
    ],
  );

  /** When search has results and no job is selected (or selected job not in current page), select the first listing so the detail panel is never empty. */
  useEffect(() => {
    if (
      !hasSearched ||
      isLoading ||
      listings.length === 0 ||
      (selectedJobId && listings.some((l) => l.id === selectedJobId))
    )
      return;
    router.replace(buildJobHref(listings[0].id));
  }, [hasSearched, isLoading, listings, selectedJobId, buildJobHref, router]);

  const showSplitLayout = hasSearched && listings.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col",
        showSplitLayout ? "h-screen overflow-hidden" : "min-h-screen",
      )}
    >
      <AppHeader user={user} onLogout={logout} />

      {/* Search bar: full-width row below nav; search UI centered. */}
      <section
        className="w-full pt-6 sm:pt-8 pb-4"
        aria-label="Perform a job search"
        ref={searchDropdownRef}
      >
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative flex flex-col">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card focus-within:shadow-[inset_0_0_0_3px_hsl(var(--ring))]">
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
                    onChange={(e) => updateSearchInput(e.target.value)}
                    onFocus={() => setSuggestionsOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setSuggestionsOpen(false), 150)
                    }
                    onKeyDown={handleSearchKeyDown}
                    className="h-9 min-w-0 flex-1 rounded-none border-0 border-r-0 bg-transparent pl-10 pr-9 text-base sm:text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Search jobs"
                    aria-expanded={suggestionsOpen}
                    aria-controls="job-suggestions-listbox"
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground"
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
                        highlightedIndex === i ? "bg-muted" : "hover:bg-muted",
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
        </div>
      </section>

      <CompareBar />

      <main
        id="main-content"
        className={cn(
          "mx-auto flex-1 w-full pt-2 pb-8",
          PAGE_PX,
          showSplitLayout
            ? "flex flex-col md:flex-row gap-0 min-h-0 overflow-hidden w-full max-w-full"
            : cn(CONTENT_MAX_W, SECTION_GAP),
        )}
      >
        <h1 className="sr-only">Browse jobs</h1>
        <div
          className={cn(
            "min-w-0 flex-1",
            showSplitLayout &&
              "md:max-w-[40%] md:flex md:flex-col md:overflow-hidden pr-2 md:pr-3",
            showSplitLayout && selectedJobId && "hidden md:flex",
          )}
        >
          <div
            className={cn(
              showSplitLayout &&
                "md:flex-1 md:min-h-0 md:overflow-hidden md:space-y-6",
              showSplitLayout && "md:flex md:flex-col",
              "space-y-6",
            )}
          >
            {!hasSearched && !user && (
              <section
                aria-label="Why sign in"
                className={cn(
                  "mx-auto max-w-2xl space-y-6 rounded-xl border border-border bg-muted/40 text-center shadow-blue ring-1 ring-primary/20",
                  CARD_PADDING_HERO,
                )}
              >
                <h2 className="text-2xl font-semibold text-foreground">
                  Find your next role,{" "}
                  <span className="text-gradient-hero">faster</span>
                </h2>
                <p className="text-base text-muted-foreground">
                  Sign in to save jobs and get AI summaries for job listings.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card variant="default" className="border-border">
                    <CardContent
                      className={cn(
                        "flex flex-col items-center gap-3 text-center",
                        CARD_PADDING_COMPACT,
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <BookmarkIcon className="size-5 text-primary" />
                      </div>
                      <h3 className="font-medium text-foreground">Save jobs</h3>
                      <p className="text-sm text-muted-foreground">
                        Bookmark listings for later and access them in one
                        place.
                      </p>
                    </CardContent>
                  </Card>
                  <Card variant="default" className="border-border">
                    <CardContent
                      className={cn(
                        "flex flex-col items-center gap-3 text-center",
                        CARD_PADDING_COMPACT,
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <SparkleIcon className="size-5 text-primary" />
                      </div>
                      <h3 className="font-medium text-foreground">
                        AI summaries
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        TLDR and requirements in seconds.
                      </p>
                    </CardContent>
                  </Card>
                  <Card variant="default" className="border-border">
                    <CardContent
                      className={cn(
                        "flex flex-col items-center gap-3 text-center",
                        CARD_PADDING_COMPACT,
                      )}
                    >
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
                    variant="default"
                    size="default"
                    iconRight={<ArrowRightIcon weight="bold" />}
                  >
                    <AuthModalLink auth="signup" redirect="/browse">
                      Get Started
                    </AuthModalLink>
                  </Button>
                </div>
              </section>
            )}
            {!hasSearched && (
              <section
                aria-label="Recommended and trending jobs"
                className="space-y-6"
              >
                <ListingSection
                  title="Recommended For You"
                  ariaLabel="Recommended for you"
                  queryKey={recommendedKeys.all}
                  queryFn={async () => {
                    const data = await fetchRecommendedListings();
                    return data.listings;
                  }}
                  enabled={!!user}
                  showCompare
                  hrefForListing={(listing) => `/browse/${listing.id}`}
                />
                <ListingSection
                  title="Trending"
                  queryKey={trendingKeys.all}
                  queryFn={() => fetchTrending(5, 168)}
                  staleTime={7 * 24 * 60 * 60 * 1000}
                  showTrendingBadge
                />
              </section>
            )}

            {hasSearched && isLoading && (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            )}

            {hasSearched && isError && (
              <p className="text-destructive" role="alert">
                {error instanceof Error
                  ? error.message
                  : "Failed to load listings"}
              </p>
            )}

            {hasSearched && !isLoading && !isError && (
              <Card
                variant="default"
                aria-label="Results"
                className={cn(
                  "flex flex-col overflow-hidden",
                  showSplitLayout && "flex-1 min-h-0",
                )}
              >
                <div className="sticky top-0 z-10 flex shrink-0 flex-col border-b border-border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {totalCount} result{totalCount !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFiltersOpen((o) => !o)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                          options={SORT_BY_OPTIONS}
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
                      className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-muted/30 p-4 shadow-sm"
                      role="region"
                      aria-label="Filters"
                    >
                      <div className="grid gap-2">
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
                          className="min-w-[8rem]"
                        />
                      </div>
                      <div className="grid gap-2">
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
                          className="min-w-0 w-full"
                          aria-label="Location"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:col-span-2 pt-4 border-t border-border">
                        <div className="flex flex-wrap gap-6">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={fullTime}
                              onChange={(e) =>
                                setFullTime(e.target.checked)
                              }
                              className="h-4 w-4 rounded-md border-border accent-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label="Full-time only"
                            />
                            Full-time
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={permanent}
                              onChange={(e) =>
                                setPermanent(e.target.checked)
                              }
                              className="h-4 w-4 rounded-md border-border accent-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label="Permanent only"
                            />
                            Permanent
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-2">
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
                          className="w-28"
                          aria-label="Minimum salary"
                        />
                      </div>
                      <div className="flex items-end gap-2 pt-4 border-t border-border mt-1 sm:col-span-2 sm:justify-end">
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
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {listings.length === 0 ? (
                    <div
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 text-center",
                        EMPTY_STATE_PADDING,
                      )}
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
                    <>
                      <p className="text-xs text-muted-foreground">
                        Select up to 3 jobs to compare them side by side.
                      </p>
                      <div className="flex flex-col gap-3">
                        {listings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            href={buildJobHref(listing.id)}
                            isSaved={savedIds.has(listing.id)}
                            isSelected={listing.id === selectedJobId}
                            onView={() => recordListingView(listing.id)}
                            onSave={
                              user
                                ? () => saveMutation.mutate(listing)
                                : undefined
                            }
                            onUnsave={
                              user
                                ? () => unsaveMutation.mutate(listing.id)
                                : undefined
                            }
                            onAddToCompare={() =>
                              addToCompare({
                                id: listing.id,
                                title: listing.title,
                              })
                            }
                            isInCompareSet={isInCompareSet(listing.id)}
                            compareSetSize={compareSet.length}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {listings.length >= 20 && (
                    <div className="flex justify-center gap-2 pt-2">
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
                </div>
              </Card>
            )}
          </div>
        </div>

        {showSplitLayout && selectedJobId && (
          <Card
            variant="default"
            aria-label="Job details"
            className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden border-border ml-0 md:ml-3"
          >
            <JobDetailPanel
              listingId={selectedJobId}
              listingIdsForNav={listings.map((l) => l.id)}
              basePath="/browse"
              onAddToCompare={() => {
                const selected = listings.find((l) => l.id === selectedJobId);
                addToCompare({
                  id: selectedJobId,
                  title: selected?.title ?? "",
                });
              }}
              isInCompareSet={isInCompareSet(selectedJobId)}
              compareSetFull={compareSet.length >= 3}
            />
          </Card>
        )}
      </main>
    </div>
  );
}

/** Browse jobs page: browse listings without login; Log in for save and AI summaries. */
export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseContent />
    </Suspense>
  );
}
