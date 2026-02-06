/**
 * Legacy /my-jobs route: redirects to /profile so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";

interface MyJobsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Redirects /my-jobs to /profile, preserving query string (e.g. job). */
export default async function MyJobsRedirectPage({ searchParams }: MyJobsPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    q.set(key, Array.isArray(value) ? value[0] : value);
  }
  const query = q.toString();
  redirect(query ? `/profile?${query}` : "/profile");
}
