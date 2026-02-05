/**
 * Login route: redirects to jobs page with auth modal open (?auth=login). Preserves ?redirect= for post-login redirect.
 */

import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams?: Promise<{ redirect?: string }> | { redirect?: string };
}

/** Redirects to the jobs page with the login modal open; preserves redirect query for post-login redirect. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const redirectTo = params.redirect
    ? `&redirect=${encodeURIComponent(params.redirect)}`
    : "";
  redirect(`/jobs?auth=login${redirectTo}`);
}
