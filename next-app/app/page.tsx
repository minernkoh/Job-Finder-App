/**
 * Home route: redirects to the job search page so users can search instantly without a landing gate.
 * Preserves query params (e.g. auth, redirect) so the auth modal can open after redirect.
 */

import { redirect } from "next/navigation";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Sends visitors to the job search page; keeps auth and redirect params so modal can show. */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    q.set(key, Array.isArray(value) ? value[0] : value);
  }
  const query = q.toString();
  redirect(query ? `/browse?${query}` : "/browse");
}
