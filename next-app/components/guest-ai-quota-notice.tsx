/**
 * Short notice for preview mode Gemini quota (parse + tailor).
 */

import { AuthModalLink } from "@/components/auth-modal-link";
import { cn } from "@ui/components/lib/utils";
import { GUEST_AI_QUOTA_MESSAGE } from "@/lib/ai-access";

export function GuestAiQuotaNotice({
  remaining,
  limit,
  className,
}: {
  remaining: number;
  limit: number;
  className?: string;
}) {
  if (remaining <= 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {GUEST_AI_QUOTA_MESSAGE}{" "}
        <AuthModalLink
          auth="signup"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Sign up
        </AuthModalLink>
      </p>
    );
  }

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Preview: {remaining} of {limit} AI tries left today (resume parse and tailor).
    </p>
  );
}
