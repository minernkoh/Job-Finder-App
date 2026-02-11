/**
 * Shared auth card layout: same outer wrapper, card, title, and optional footer for login, register, and admin pages so they look consistent.
 */

import { XIcon } from "@phosphor-icons/react";
import { Card, CardContent } from "@ui/components";
import { CARD_PADDING_AUTH } from "@/lib/layout";
import { EYEBROW_CLASS } from "@/lib/styles";

/** Same close button style as auth modal for consistency. */
export const authCloseButtonClass =
  "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

/** Narrow width for auth modal card; matches AuthCard layout. */
export const authModalNarrowWidthClass = "w-full max-w-lg";
/** Min height for auth modal content; matches AuthCard CardContent. */
export const authModalHeightClass = "min-h-[22rem]";

interface AuthCardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional section label above the title (eyebrow style). */
  eyebrow?: string;
  /** Optional content rendered above the card (e.g. Back to home link). */
  backLink?: React.ReactNode;
  /** When true, do not render the title/eyebrow block. */
  hideTitle?: boolean;
  /** Optional close button (same look as auth modal); e.g. navigate back. */
  onClose?: () => void;
}

/** Renders a centered card with title and optional footer; used by login, register, and admin auth pages. */
export function AuthCard({
  title,
  children,
  footer,
  eyebrow,
  backLink,
  hideTitle = false,
  onClose,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
      {backLink != null && backLink}
      <Card variant="elevated" className="w-full max-w-lg overflow-hidden">
        {onClose != null && (
          <div className="flex min-h-[3rem] items-center justify-end border-b border-border pr-2 py-2">
            <button
              type="button"
              onClick={onClose}
              className={authCloseButtonClass}
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        )}
        <CardContent className={`min-h-[22rem] space-y-6 ${CARD_PADDING_AUTH}`}>
          {!hideTitle && (
            <div className="space-y-1 text-center">
              {eyebrow != null && <p className={EYEBROW_CLASS}>{eyebrow}</p>}
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            </div>
          )}
          {children}
          {footer != null && footer}
        </CardContent>
      </Card>
    </div>
  );
}
