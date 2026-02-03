/**
 * Job details page: shows full listing info. Includes save/unsave and placeholder for "Summarize with AI".
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, BookmarkSimple } from "@phosphor-icons/react";
import { Button } from "@ui/components";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/AuthContext";
import { fetchListing, recordListingView } from "@/lib/api/listings";
import { useSavedListings } from "@/hooks/useSavedListings";
import { listingKeys } from "@/lib/query-keys";
import { useEffect, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

/** Inner content: back link, listing details, save button, placeholder for summarize. */
function JobDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

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
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="mx-auto max-w-3xl p-4">
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
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-3xl items-center justify-between border-b border-border py-4">
        <Link
          href="/jobs"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
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
                <Bookmark weight="fill" className="text-primary" />
                Saved
              </>
            ) : (
              <>
                <BookmarkSimple />
                Save
              </>
            )}
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-3xl space-y-6 py-8">
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
          {listing.country && listing.country !== "sg" && (
            <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs">
              {listing.country.toUpperCase()}
            </span>
          )}
        </div>

        {sanitizedDescription.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </h2>
            <div
              className="rounded-lg border border-border bg-card p-4 text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-80 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_strong]:font-semibold [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </section>
        )}

        {listing.sourceUrl && (
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            View original posting
          </a>
        )}

        <section className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
          Summarize with AI (coming soon)
        </section>
      </main>
    </div>
  );
}

/** Job details page: protected. */
export default function JobDetailsPage() {
  return (
    <ProtectedRoute>
      <JobDetailsContent />
    </ProtectedRoute>
  );
}
