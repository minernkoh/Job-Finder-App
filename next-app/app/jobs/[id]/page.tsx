/**
 * Legacy /jobs/[id] route: redirects to /browse/[id] so shared links keep working.
 */

import { redirect } from "next/navigation";

interface JobDetailRedirectProps {
  params: Promise<{ id: string }>;
}

/** Redirects /jobs/:id to /browse/:id. */
export default async function JobDetailRedirectPage({ params }: JobDetailRedirectProps) {
  const { id } = await params;
  if (!id) redirect("/browse");
  redirect(`/browse/${id}`);
}
