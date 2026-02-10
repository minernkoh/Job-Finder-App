/**
 * Admin page shell: alias for PageShell. Used by admin list pages (Users, Listings, Summaries).
 */

import { PageShell } from "./page-shell";

/** Renders admin page wrapper with h1 and optional header action; children provide the main content (Cards). */
export function AdminPageShell(
  props: React.ComponentProps<typeof PageShell>
) {
  return <PageShell {...props} />;
}
