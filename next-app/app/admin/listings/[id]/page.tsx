/**
 * Admin full-page job view: single listing detail with admin nav (no search, no compare). Used from dashboard and listings table.
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@ui/components";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { fetchListing } from "@/lib/api/listings";
import { listingKeys } from "@/lib/query-keys";
import { SECTION_GAP } from "@/lib/layout";

/** Admin job detail content: back link to listings table and JobDetailPanel without compare UI. */
function AdminListingDetailContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: listingKeys(id ?? ""),
    queryFn: () => fetchListing(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className={SECTION_GAP}>
        <p className="text-muted-foreground">Listing ID is missing.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/admin/listings">Back to listings</Link>
        </Button>
      </div>
    );
  }

  if (isError || (!isLoading && !listing)) {
    return (
      <div className={SECTION_GAP}>
        <p className="text-muted-foreground">Listing not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/admin/listings">Back to listings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={SECTION_GAP}>
      <Card
        variant="default"
        className="flex flex-col min-h-0 border-border overflow-hidden"
      >
        <JobDetailPanel
          listingId={id}
          backToHref="/admin/listings"
          backToLabel="Back to listings"
        />
      </Card>
    </div>
  );
}

/** Admin full-page listing by ID; rendered inside admin layout (admin nav, no CompareBar). */
export default function AdminListingDetailPage() {
  return <AdminListingDetailContent />;
}
