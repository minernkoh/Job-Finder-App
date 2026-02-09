/**
 * Home route: redirects to /admin for admins and /browse for others. Preserves query params
 * (e.g. auth, redirect) so the auth modal can open after redirect.
 */

import { HomeRedirect } from "@/components/home-redirect";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Sends admins to /admin and others to /browse; keeps auth and redirect params for modal. */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    q.set(key, Array.isArray(value) ? value[0] : value);
  }
  const queryString = q.toString();
  return <HomeRedirect queryString={queryString} />;
}
