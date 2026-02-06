/**
 * Job details page: full-page view with shared header and JobDetailPanel. Direct and shared links use this route.
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { useAuth } from "@/contexts/AuthContext";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";

/** Full job details page: single header (logo, back, nav) plus JobDetailPanel. */
export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const { user, logout } = useAuth();

  if (!id) {
    router.push("/jobs");
    return null;
  }

  return (
    <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
      <AppHeader
        backHref="/jobs"
        backLabel="Back to jobs"
        user={user}
        onLogout={logout}
      />
      <main className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W)}>
        <JobDetailPanel listingId={id} />
      </main>
    </div>
  );
}
