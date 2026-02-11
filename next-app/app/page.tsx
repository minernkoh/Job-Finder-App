/**
 * Home route: redirects to the job search page so users can search instantly without a landing gate.
 * Preserves query params (e.g. auth, redirect) so the auth modal can open after redirect.
 */

import { redirect } from "next/navigation";
import { buildRedirectUrl } from "@/lib/redirect";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

/** Sends visitors to the job search page; keeps auth and redirect params so modal can show. */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  redirect(buildRedirectUrl("/browse", params));
}
