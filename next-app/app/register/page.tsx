/**
 * Register page: redirects to /login?tab=signup so user auth uses the tabbed page. Preserves ?redirect= if present.
 */

import { redirect } from "next/navigation";

interface RegisterPageProps {
  searchParams?: Promise<{ redirect?: string }> | { redirect?: string };
}

/** Redirects to the login page with signup tab selected; preserves redirect query for post-login redirect. */
export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const redirectTo = params.redirect
    ? `&redirect=${encodeURIComponent(params.redirect)}`
    : "";
  redirect(`/login?tab=signup${redirectTo}`);
}
