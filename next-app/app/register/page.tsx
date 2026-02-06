/**
 * Register page: redirects to jobs page with signup modal open (?auth=signup). Preserves ?redirect= if present.
 */

import { redirect } from "next/navigation";

interface RegisterPageProps {
  searchParams?: Promise<{ redirect?: string }> | { redirect?: string };
}

/** Redirects to the jobs page with the signup modal open; preserves redirect query for post-register redirect. */
export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const redirectTo = params.redirect
    ? `&redirect=${encodeURIComponent(params.redirect)}`
    : "";
  redirect(`/browse?auth=signup${redirectTo}`);
}
