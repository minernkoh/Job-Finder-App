/**
 * Legacy /jobs route: redirects to /browse so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";
import { buildBrowseRedirectUrl } from "@/lib/redirect-browse";

interface JobsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Redirects /jobs to /browse, preserving query string (e.g. auth, job, keyword). */
export default async function JobsRedirectPage({ searchParams }: JobsPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  redirect(buildBrowseRedirectUrl("/browse", params));
}
