/**
 * Legacy /browser/compare route: redirects to /browse/compare so bookmarks keep working.
 */

import { redirect } from "next/navigation";
import { buildBrowseRedirectUrl } from "@/lib/redirect-browse";

interface BrowserCompareRedirectProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Redirects /browser/compare to /browse/compare, preserving query string (e.g. ids). */
export default async function BrowserCompareRedirectPage({ searchParams }: BrowserCompareRedirectProps) {
  const params = await Promise.resolve(searchParams ?? {});
  redirect(buildBrowseRedirectUrl("/browse/compare", params));
}
