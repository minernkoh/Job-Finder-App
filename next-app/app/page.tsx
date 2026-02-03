/**
 * Home page: landing with links to Login, Register, and Jobs. No login required.
 */

import Link from "next/link";
import { Button } from "@ui/components";

/** Renders the home page with title and links to login, register, and jobs. */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Job Finder App
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          Find and browse jobs with AI summaries. Log in or register to get
          started.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild variant="default" className="rounded-xl">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/login?tab=signup">Register</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/jobs">Jobs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
