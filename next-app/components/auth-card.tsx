/**
 * Shared auth card layout: same outer wrapper, card, title, and optional footer for login, register, and admin pages so they look consistent.
 */

import { XIcon } from "@phosphor-icons/react";
import { Card, CardContent } from "@ui/components";

/** Same close button style as auth modal for consistency. */
export const authCloseButtonClass =
  "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

/** Shared width for auth modal and auth card: full width on small screens, fixed min on sm+ to avoid content-hugging. */
export const authModalWidthClass =
  "w-full min-w-0 sm:min-w-[42rem] max-w-2xl";

/** Narrower width for the auth modal only (overlay); auth card pages keep authModalWidthClass. */
export const authModalNarrowWidthClass =
  "w-full min-w-0 sm:min-w-[24rem] max-w-md";

/** Shared min height for auth modal and auth card content so all auth modals/cards are the same size. */
export const authModalMinHeightClass = "min-h-[22rem]";

/** Fixed-ish height for modal content so login and signup appear identical. */
export const authModalHeightClass = "min-h-[28rem]";

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
  /** When true, use narrower width and less top space (e.g. for admin auth). */
  compact?: boolean;
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
  compact = false,
}: AuthCardProps) {
  const widthClass = compact ? authModalNarrowWidthClass : authModalWidthClass;
  const layoutClass = compact
    ? "flex min-h-screen flex-col items-center justify-start pt-6 gap-4 bg-background p-4"
    : "flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4";
  return (
    <div className={layoutClass}>
      {backLink != null && backLink}
      <Card variant="elevated" className={`${widthClass} overflow-hidden`}>
        {onClose != null && (
          <div className="flex min-h-[3rem] items-center justify-end pr-2 py-2">
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
        <CardContent
          className={`${compact ? authModalMinHeightClass : authModalHeightClass} space-y-6 p-10`}
        >
          {!hideTitle && (
            <div className="space-y-1 text-center">
              {eyebrow != null && <p className="eyebrow">{eyebrow}</p>}
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
