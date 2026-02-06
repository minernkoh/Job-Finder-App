/**
 * Legacy /browser route: redirects to /browse so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";
import { buildBrowseRedirectUrl } from "@/lib/redirect-browse";

interface BrowserPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Redirects /browser to /browse, preserving query string (e.g. auth, job, keyword). */
export default async function BrowserRedirectPage({ searchParams }: BrowserPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  redirect(buildBrowseRedirectUrl("/browse", params));
}
