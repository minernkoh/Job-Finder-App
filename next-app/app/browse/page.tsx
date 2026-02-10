/**
 * Browse jobs page: Search card (What, Country), then results with Filters and listings feed.
 */

"use client";

import {
  ArrowRightIcon,
  BriefcaseIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  ScalesIcon,
  SlidersIcon,
  SparkleIcon,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteListingApi,
  fetchListings,
  recordListingView,
  type ListingsFilters,
} from "@/lib/api/listings";
import { getErrorMessage } from "@/lib/api/errors";
import { AuthModalLink } from "@/components/auth-modal-link";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { UserMenu } from "@/components/user-menu";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { ListingCard } from "@/components/listing-card";
import { RecommendedListings } from "@/components/recommended-listings";
import { TrendingListings } from "@/components/trending-listings";
import { useCompare } from "@/contexts/CompareContext";
import { useIsLgViewport } from "@/hooks/useIsLgViewport";
import { useSavedListings } from "@/hooks/useSavedListings";
import { JOB_SEARCH_COUNTRIES } from "@/lib/constants/countries";
import { CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { listingKeys, listingsKeys, recommendedKeys } from "@/lib/query-keys";
import { UserOnlyRoute } from "@/components/user-only-route";
import { cn } from "@ui/components/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_TRANSITION, FADE_IN, SLIDE_UP, staggerDelay } from "@/lib/animations";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Relevance" },
  { value: "salary_desc", label: "Salary: High to Low" },
  { value: "salary_asc", label: "Salary: Low to High" },
  { value: "date_desc", label: "Date: Newest First" },
  { value: "date_asc", label: "Date: Oldest First" },
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

/** Inner content: shared header, search below nav, compare bar, then split layout when results exist. */
function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { compareSet, addToCompare, removeFromCompare, isInCompareSet } =
    useCompare();
  const selectedJobId = searchParams?.get("job") ?? null;
  const isLg = useIsLgViewport();

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

  /** Focus main search input when user presses '/' (unless they're typing in an input). */
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

  const queryClient = useQueryClient();
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

  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => deleteListingApi(listingId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: listingKeys(deletedId) });
      queryClient.invalidateQueries({ queryKey: recommendedKeys.all });
      toast.success("Listing deleted");
      if (selectedJobId === deletedId) {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.delete("job");
        router.replace("/browse?" + params.toString());
      }
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to delete listing"));
    },
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

  const listings = useMemo(() => data?.listings ?? [], [data?.listings]);
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

  /** When results load with no job in URL, select the first listing only on lg+ so the right panel is populated; on small screens show the list first. */
  useEffect(() => {
    if (!isLg || !hasSearched || listings.length === 0 || selectedJobId) return;
    router.replace(buildJobHref(listings[0].id));
  }, [isLg, hasSearched, listings, selectedJobId, router, buildJobHref]);

  const showSplitLayout = hasSearched && listings.length > 0;

  /** URL to return to the listings list (current search params without job). Passed to JobDetailPanel for "Back to Listings" on small screens. */
  const backToListingsHref = useMemo(() => {
    if (!showSplitLayout || !selectedJobId) return undefined;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("job");
    const qs = params.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }, [showSplitLayout, selectedJobId, searchParams]);

  return (
    <>
      <div className="max-h-[5rem]">
        <AppHeader user={user} onLogout={logout} />
      </div>
      <div
        className={cn(
          "min-h-screen flex flex-col",
          PAGE_PX,
          showSplitLayout && "lg:max-h-screen lg:overflow-hidden",
        )}
      >
        {/* Search bar: full-width row below nav; search UI centered. Equal gap above (nav→search) and below (search→main). */}
        <section
          className="w-full pt-8 pb-8"
          aria-label="Perform a job search"
          ref={searchDropdownRef}
        >
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative flex flex-col">
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
                      onChange={(e) => updateSearchInput(e.target.value)}
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
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
                  >
                    {filteredSuggestions.map((role, i) => (
                      <button
                        key={role}
                        type="button"
                        role="option"
                        aria-selected={highlightedIndex === i}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm rounded-lg",
                          highlightedIndex === i
                            ? "bg-muted"
                            : "hover:bg-muted",
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

        <AnimatePresence>
          {compareSet.length > 0 && (
            <CompareBar key="compare-bar" fullWidth={showSplitLayout} />
          )}
        </AnimatePresence>

        <main
          id="main-content"
          className={cn(
            "mx-auto flex-1 w-full pt-0 pb-8",
            showSplitLayout
              ? "flex flex-col lg:flex-row gap-0 min-h-0 w-full max-w-full"
              : cn(CONTENT_MAX_W, SECTION_GAP),
          )}
        >
          <h1 className="sr-only">Browse jobs</h1>
          <div
            className={cn(
              "min-w-0 flex-1",
              showSplitLayout &&
                "lg:max-w-[40%] lg:flex lg:flex-col lg:min-h-0 pr-3 lg:pr-4",
              showSplitLayout && selectedJobId && "hidden lg:flex",
            )}
          >
            <div
              className={cn(
                showSplitLayout &&
                  "lg:min-w-0 lg:flex-1 lg:min-h-0 lg:overflow-auto lg:rounded-2xl lg:space-y-6 lg:pl-1 lg:pr-1",
              )}
            >
              {!hasSearched && (
                <>
                  <RecommendedListings
                    userRole={user?.role}
                    onDeleteListing={
                      user?.role === "admin"
                        ? (listingId) => deleteListingMutation.mutate(listingId)
                        : undefined
                    }
                  />
                </>
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
                    Sign in to compare jobs, use your resume for better matches,
                    and get AI summaries for job listings.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card variant="default" className="border-border">
                      <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <ScalesIcon className="size-5 text-primary" />
                        </div>
                        <h3 className="font-medium text-foreground">
                          Compare jobs
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Select up to 3 listings and compare them side by side.
                        </p>
                      </CardContent>
                    </Card>
                    <Card variant="default" className="border-border">
                      <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
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
                      <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileTextIcon className="size-5 text-primary" />
                        </div>
                        <h3 className="font-medium text-foreground">
                          Resume parser
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Upload or paste your resume; we extract skills for
                          better job matches.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      asChild
                      variant="default"
                      size="default"
                      className="h-11 min-w-[10rem]"
                      iconRight={<ArrowRightIcon weight="bold" />}
                    >
                      <AuthModalLink auth="signup" redirect="/browse">
                        Get Started
                      </AuthModalLink>
                    </Button>
                  </div>
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`results-${keyword}-${page}-${appliedSortBy}`}
                    {...FADE_IN}
                    transition={EASE_TRANSITION}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <section aria-label="Results" className="space-y-4">
                        {/* Toolbar aligned with right panel (JobDetailPanel) header: single line, sticky, same border/padding */}
                        <div className="sticky top-0 z-10 -mx-4 -mt-6 flex shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:px-6">
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {totalCount} result{totalCount !== 1 ? "s" : ""}
                      </p>
                      <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
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
                            className="min-w-[10rem]"
                          />
                        </div>
                      </div>
                    </div>
                    {filtersOpen && (
                      <div
                        id="results-filters"
                        className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4"
                        role="region"
                        aria-label="Filters"
                      >
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="space-y-1">
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
                              className="min-w-[10rem]"
                            />
                          </div>
                          <div className="space-y-1">
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
                              className="w-40"
                              aria-label="Location"
                            />
                          </div>
                          <div className="space-y-1">
                            <span
                              className="block text-xs text-muted-foreground"
                              aria-hidden
                            >
                              Job type
                            </span>
                            <div className="flex items-center gap-4 pt-0.5">
                              <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={fullTime}
                                  onChange={(e) =>
                                    setFullTime(e.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-border"
                                  aria-label="Full-time only"
                                />
                                <span className="text-muted-foreground">
                                  Full-time
                                </span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={permanent}
                                  onChange={(e) =>
                                    setPermanent(e.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-border"
                                  aria-label="Permanent only"
                                />
                                <span className="text-muted-foreground">
                                  Permanent
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className="space-y-1">
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
                              className="w-32"
                              aria-label="Minimum salary"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border pt-3">
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
                      <>
                        <div className="flex flex-col gap-3">
                          {listings.map((listing, index) => (
                            <motion.div
                              key={listing.id}
                              {...SLIDE_UP}
                              transition={{
                                ...EASE_TRANSITION,
                                ...staggerDelay(index),
                              }}
                            >
                              <ListingCard
                                listing={listing}
                                href={buildJobHref(listing.id)}
                                isSelected={selectedJobId === listing.id}
                                isSaved={savedIds.has(listing.id)}
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
                                onAddToCompare={
                                  isInCompareSet(listing.id)
                                    ? () => removeFromCompare(listing.id)
                                    : () =>
                                        addToCompare({
                                          id: listing.id,
                                          title: listing.title,
                                        })
                                }
                                isInCompareSet={isInCompareSet(listing.id)}
                                compareSetSize={compareSet.length}
                                userRole={user?.role}
                                onDeleteListing={
                                  user?.role === "admin"
                                    ? (listingId) =>
                                        deleteListingMutation.mutate(listingId)
                                    : undefined
                                }
                              />
                            </motion.div>
                          ))}
                        </div>
                      </>
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
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              )}
              {!hasSearched && (
                <TrendingListings
                  userRole={user?.role}
                  onDeleteListing={
                    user?.role === "admin"
                      ? (listingId) => deleteListingMutation.mutate(listingId)
                      : undefined
                  }
                />
              )}
            </div>
          </div>

          {showSplitLayout && selectedJobId && (
            <aside className="flex flex-1 flex-col min-w-0">
              <Card
                variant="default"
                className="flex flex-1 flex-col min-h-0 overflow-hidden border-border"
              >
                <JobDetailPanel
                  listingId={selectedJobId}
                  listingIdsForNav={listings.map((l) => l.id)}
                  basePath="/browse"
                  backToListingsHref={backToListingsHref}
                  onAddToCompare={
                    isInCompareSet(selectedJobId)
                      ? () => removeFromCompare(selectedJobId)
                      : () => {
                          const selectedListing = listings.find(
                            (l) => l.id === selectedJobId,
                          );
                          if (selectedListing)
                            addToCompare({
                              id: selectedListing.id,
                              title: selectedListing.title,
                            });
                        }
                  }
                  isInCompareSet={isInCompareSet(selectedJobId)}
                  compareSetFull={compareSet.length >= 3}
                  onDeleteListing={
                    user?.role === "admin"
                      ? (listingId) => deleteListingMutation.mutate(listingId)
                      : undefined
                  }
                />
              </Card>
            </aside>
          )}
          {showSplitLayout && !selectedJobId && (
            <aside className="hidden lg:flex flex-1 flex-col min-w-0">
              <Card
                variant="default"
                className="flex flex-1 flex-col min-h-0 border-border"
              >
                <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
                  Select a job
                </div>
              </Card>
            </aside>
          )}
        </main>
      </div>
    </>
  );
}

/** Browse jobs page: browse listings without login; Log in for save and AI summaries. Admins are redirected to /admin. */
export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <UserOnlyRoute requireAuth={false}>
        <BrowseContent />
      </UserOnlyRoute>
    </Suspense>
  );
}
