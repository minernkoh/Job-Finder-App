/**
 * Banner shown while the user is in guest preview mode.
 */

"use client";

import { AuthModalLink } from "@/components/auth-modal-link";
import { GuestAiQuotaNotice } from "@/components/guest-ai-quota-notice";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestAiQuota } from "@/hooks/useGuestAiQuota";
import { CONTENT_MAX_W, PAGE_PX } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";

/** Slim bar under the header explaining preview mode and offering sign up / sign in. */
export function PreviewModeBanner() {
  const { isDemo } = useAuth();
  const { remaining, limit } = useGuestAiQuota();
  if (!isDemo) return null;

  return (
    <div
      className={cn(
        "border-b border-primary/20 bg-primary/10",
        PAGE_PX,
        "py-2",
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col items-center justify-center gap-1 text-center text-sm text-foreground",
          CONTENT_MAX_W,
        )}
      >
        <span>
          You&apos;re in <strong>preview mode</strong>. Browse live jobs from
          Adzuna and MyCareersFuture; resume parse and tailor use real AI (
          {limit} tries per day). Summaries are examples and nothing is saved to
          an account.
        </span>
        <GuestAiQuotaNotice remaining={remaining} limit={limit} />
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          <AuthModalLink
            auth="signup"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Sign up
          </AuthModalLink>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <AuthModalLink
            auth="login"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Sign in
          </AuthModalLink>
        </span>
      </div>
    </div>
  );
}
