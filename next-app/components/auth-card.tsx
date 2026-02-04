/**
 * Shared auth card layout: same outer wrapper, card, title, and optional footer for login, register, and admin pages so they look consistent.
 */

import { Card, CardContent } from "@ui/components";

const eyebrowClass = "text-xs uppercase tracking-widest text-muted-foreground";

interface AuthCardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional section label above the title (eyebrow style). */
  eyebrow?: string;
  /** Optional content rendered above the card (e.g. Back to home link). */
  backLink?: React.ReactNode;
}

/** Renders a centered card with title and optional footer; used by login, register, and admin auth pages. */
export function AuthCard({
  title,
  children,
  footer,
  eyebrow,
  backLink,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
      {backLink != null && backLink}
      <Card variant="elevated" className="w-full max-w-sm">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-1 text-center">
            {eyebrow != null && <p className={eyebrowClass}>{eyebrow}</p>}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {children}
          {footer != null && footer}
        </CardContent>
      </Card>
    </div>
  );
}
