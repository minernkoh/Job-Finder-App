/**
 * Full job page: single listing detail with AI summary. Used when opening a job in its own page (e.g. from compare "Open full page").
 */

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { Button, Card } from "@ui/components";
import { CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { fetchListing } from "@/lib/api/listings";
import { listingKeys } from "@/lib/query-keys";
import { cn } from "@ui/components/lib/utils";
import { UserOnlyRoute } from "@/components/user-only-route";
import { Suspense } from "react";

/** Full-page job view: header, compare bar, and job detail with back link to browse. */
function BrowseJobPageContent() {
  const params = useParams();
  const { user, logout } = useAuth();
  const { addToCompare, removeFromCompare, isInCompareSet, compareSet } =
    useCompare();
  const id = typeof params?.id === "string" ? params.id : null;
  const { data: listing } = useQuery({
    queryKey: listingKeys(id ?? ""),
    queryFn: () => fetchListing(id!),
    enabled: !!id,
  });
  const title = listing?.title ?? id ?? "";

  if (!id) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader user={user} onLogout={logout} />
        <main
          id="main-content"
          className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP, PAGE_PX)}
        >
          <p className="text-muted-foreground">Job not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/browse">Back to browse</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={logout} />
      <CompareBar />

      <main
        id="main-content"
        className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP, PAGE_PX)}
      >
        <Card variant="default" className="flex flex-col min-h-0 border-border overflow-hidden">
          <JobDetailPanel
            listingId={id}
            basePath="/browse"
            onAddToCompare={
              isInCompareSet(id)
                ? () => removeFromCompare(id)
                : () => addToCompare({ id, title })
            }
            isInCompareSet={isInCompareSet(id)}
            compareSetFull={compareSet.length >= 3}
          />
        </Card>
      </main>
    </div>
  );
}

/** Full job page by ID; protected so auth and compare work. */
export default function BrowseJobPage() {
  return (
    <Suspense fallback={null}>
      <UserOnlyRoute requireAuth={false}>
        <BrowseJobPageContent />
      </UserOnlyRoute>
    </Suspense>
  );
}
