/**
 * Home route: redirects to the job search page so users can search instantly without a landing gate.
 */

import { redirect } from "next/navigation";

/** Sends visitors to the job search page. */
export default function Home() {
  redirect("/jobs");
}
