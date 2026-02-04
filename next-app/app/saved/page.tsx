/**
 * Legacy /saved route: redirects to /my-jobs so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";

/** Redirects /saved to /my-jobs. */
export default function SavedPage() {
  redirect("/my-jobs");
}
