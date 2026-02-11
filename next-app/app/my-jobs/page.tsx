/**
 * Legacy /my-jobs route: redirects to /profile so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";
import { buildRedirectUrl } from "@/lib/redirect";

interface MyJobsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Redirects /my-jobs to /profile, preserving query string (e.g. job). */
export default async function MyJobsRedirectPage({ searchParams }: MyJobsPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  redirect(buildRedirectUrl("/profile", params));
}
