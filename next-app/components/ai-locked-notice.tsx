/**
 * Short invite-only notice for Gemini features when the user is in preview mode.
 */

"use client";

import Link from "next/link";

export function AiLockedNotice({ feature }: { feature: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm text-foreground">
        {feature} are invite-only in preview.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Unlock them in{" "}
        <Link href="/profile/settings" className="text-primary underline hover:opacity-80">
          Settings
        </Link>{" "}
        with an access code.
      </p>
    </div>
  );
}
