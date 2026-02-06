/**
 * Legacy /saved route: redirects to /profile so bookmarks and links keep working.
 */

import { redirect } from "next/navigation";

/** Redirects /saved to /profile. */
export default function SavedPage() {
  redirect("/profile");
}
