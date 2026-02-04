/**
 * Login route: redirects to home with auth modal open (?auth=login). Preserves ?redirect= for post-login redirect.
 */

import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams?: Promise<{ redirect?: string }> | { redirect?: string };
}

/** Redirects to the homepage with the login modal open; preserves redirect query for post-login redirect. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const redirectTo = params.redirect
    ? `&redirect=${encodeURIComponent(params.redirect)}`
    : "";
  redirect(`/?auth=login${redirectTo}`);
}
