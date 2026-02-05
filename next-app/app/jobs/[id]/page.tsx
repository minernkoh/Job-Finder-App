/**
 * Job details page: shows full listing info, save/unsave, and "Summarize with AI" with summary display.
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthModalLink } from "@/components/auth-modal-link";
import { Logo } from "@/components/logo";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  BookmarkSimpleIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatPostedDate, formatSalaryRange } from "@/lib/format";
import { fetchListing, recordListingView } from "@/lib/api/listings";
import { createSummary } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import { useSavedListings } from "@/hooks/useSavedListings";
import { UserMenu } from "@/components/user-menu";
import { listingKeys } from "@/lib/query-keys";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";

const eyebrowClass = "text-xs uppercase tracking-widest text-muted-foreground";

/** Renders AI summary: tldr, responsibilities, requirements, SG signals, caveats. */
function SummaryPanel({ summary }: { summary: SummaryWithId }) {
  return (
    <Card variant="elevated" className="text-sm">
      <CardContent className="p-4 space-y-4">
        <p className="text-foreground">{summary.tldr}</p>
        {summary.keyResponsibilities &&
          summary.keyResponsibilities.length > 0 && (
            <div>
              <h3 className={cn(eyebrowClass, "mb-1")}>Key responsibilities</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                {summary.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        {summary.requirements && summary.requirements.length > 0 && (
          <div>
            <h3 className={cn(eyebrowClass, "mb-1")}>Requirements</h3>
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {summary.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.salarySgd && (
          <p className="text-foreground">
            <span className={cn(eyebrowClass)}>Salary (SGD): </span>
            {summary.salarySgd}
          </p>
        )}
        {summary.skillsFutureKeywords &&
          summary.skillsFutureKeywords.length > 0 && (
            <p className="text-foreground">
              <span className={cn(eyebrowClass)}>SkillsFuture: </span>
              {summary.skillsFutureKeywords.join(", ")}
            </p>
          )}
        {summary.caveats && summary.caveats.length > 0 && (
          <p className="text-muted-foreground text-xs">
            <span className={eyebrowClass}>Caveats: </span>
            {summary.caveats.join("; ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Inner content: back link, listing details, save button, summarize button and summary panel. */
function JobDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, logout } = useAuth();

  const {
    data: listing,
    isLoading,
    isError,
  } = useQuery({
    queryKey: listingKeys(id),
    queryFn: () => fetchListing(id),
    enabled: !!id,
  });

  const { isSaved, saveMutation, unsaveMutation } = useSavedListings();
  const [summary, setSummary] = useState<SummaryWithId | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const summarizeMutation = useMutation({
    mutationFn: () => createSummary({ listingId: id }),
    onSuccess: (data) => {
      setSummary(data);
      setSummaryError(null);
    },
    onError: (err) => {
      setSummaryError(
        err instanceof Error ? err.message : "Failed to summarize"
      );
    },
  });

  useEffect(() => {
    if (id) recordListingView(id);
  }, [id]);

  const sanitizedDescription = useMemo(() => {
    if (!listing?.description) return "";
    const sanitized = DOMPurify.sanitize(listing.description, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "strong",
        "b",
        "em",
        "i",
        "a",
        "h1",
        "h2",
        "h3",
      ],
      ADD_ATTR: ["href", "target", "rel"],
    });
    return sanitized.trim();
  }, [listing?.description]);

  if (!id) {
    router.push("/jobs");
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <p className="text-destructive">Listing not found.</p>
        <Link
          href="/jobs"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 border-b border-border py-4">
        <Logo />
        <nav className="flex items-center gap-3">
          {user && (
            <>
              <Link
                href="/my-jobs"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                My Jobs
              </Link>
            </>
          )}
          {user ? (
            <UserMenu user={user} onLogout={logout} />
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

      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-border py-4">
        <Link
          href="/jobs"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon size={16} />
          Back to jobs
        </Link>
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              isSaved(id)
                ? unsaveMutation.mutate(id)
                : saveMutation.mutate(listing)
            }
          >
            {isSaved(id) ? (
              <>
                <BookmarkIcon weight="fill" className="text-primary" />
                Saved
              </>
            ) : (
              <>
                <BookmarkSimpleIcon />
                Save
              </>
            )}
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-5xl space-y-8 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {listing.title}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            {listing.company}
          </p>
          {listing.location && (
            <p className="mt-1 text-sm text-muted-foreground">
              {listing.location}
            </p>
          )}
          {(() => {
            const salary = formatSalaryRange(
              listing.salaryMin,
              listing.salaryMax,
              listing.country
            );
            return salary ? (
              <p className="mt-1 text-sm font-medium text-foreground">
                {salary}
              </p>
            ) : null;
          })()}
          {listing.country && listing.country !== "sg" && (
            <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {listing.country.toUpperCase()}
            </span>
          )}
          {(() => {
            const posted = formatPostedDate(listing.postedAt);
            return posted ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Posted {posted}
              </p>
            ) : null;
          })()}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          {(sanitizedDescription.length > 0 || listing.sourceUrl) && (
            <section className="space-y-2 lg:sticky lg:top-4">
              <h2 className={cn(eyebrowClass, "mb-2")}>Description</h2>
              <Card variant="elevated" className="text-sm">
                {sanitizedDescription.length > 0 && (
                  <CardContent
                    className="p-4 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_b]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                  />
                )}
                {listing.sourceUrl && (
                  <div
                    className={cn(
                      "px-4 pb-4",
                      sanitizedDescription.length > 0 && "border-t border-border pt-4"
                    )}
                  >
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary hover:underline"
                    >
                      View original posting
                    </a>
                  </div>
                )}
              </Card>
            </section>
          )}

          <section className="space-y-3">
            <h2 className={eyebrowClass}>AI Summary</h2>
            {summary ? (
              <SummaryPanel summary={summary} />
            ) : user ? (
              <>
                <Button
                  onClick={() => summarizeMutation.mutate()}
                  disabled={summarizeMutation.isPending}
                >
                  {summarizeMutation.isPending ? (
                    "Summarizing…"
                  ) : (
                    <>
                      <SparkleIcon size={16} className="mr-2" />
                      Summarize with AI
                    </>
                  )}
                </Button>
                {summaryError && (
                  <p className="text-sm text-destructive">{summaryError}</p>
                )}
              </>
            ) : (
              <Button asChild variant="default" size="sm">
                <AuthModalLink
                  auth="login"
                  redirect={id ? `/jobs/${id}` : undefined}
                >
                  Log in to get AI summaries
                </AuthModalLink>
              </Button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Job details page: viewable without login; Save and AI summary require login. */
export default function JobDetailsPage() {
  return <JobDetailsContent />;
}
