/**
 * Legacy /browser/[id] route: redirects to /browse/[id] so shared links keep working.
 */

import { redirect } from "next/navigation";

interface BrowserJobRedirectProps {
  params: Promise<{ id: string }>;
}

/** Redirects /browser/:id to /browse/:id. */
export default async function BrowserJobRedirectPage({ params }: BrowserJobRedirectProps) {
  const { id } = await params;
  if (!id) redirect("/browse");
  redirect(`/browse/${id}`);
}
