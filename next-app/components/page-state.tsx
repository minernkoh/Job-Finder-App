/**
 * Page state: consistent full-page loading and error UI for admin and other pages.
 */

"use client";

import { Button } from "@ui/components";

interface PageLoadingProps {
  /** Message to show (default "Loading…"). */
  message?: string;
  /** When true, use min-h-screen for full-page centering; otherwise min-h-[40vh]. */
  fullScreen?: boolean;
}

/** Inline loading text; use for table/card loading state within a container. */
export function InlineLoading({ message = "Loading…" }: { message?: string }) {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}

/** Inline error text; use for form or card error display. */
export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  );
}

/** Centered loading state; use for initial page or section load. */
export function PageLoading({
  message = "Loading…",
  fullScreen = false,
}: PageLoadingProps) {
  return (
    <div
      className={`flex items-center justify-center p-4 ${fullScreen ? "min-h-screen" : "min-h-[40vh]"}`}
    >
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

interface PageLoadingSkeletonProps {
  /** Optional wrapper className (e.g. layout padding/gap). */
  className?: string;
}

/** Skeleton loading state: two pulse bars (title + content). Use in panels or cards where a skeleton is preferred over a message. Pass a wrapper className that includes vertical gap (e.g. GAP_LG) if desired. */
export function PageLoadingSkeleton({ className }: PageLoadingSkeletonProps) {
  return (
    <div className={className}>
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

interface PageErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional secondary action (e.g. "Back to admin"). */
  onBack?: () => void;
  backLabel?: string;
  /** When true, use min-h-screen for full-page centering. */
  fullScreen?: boolean;
}

/** Centered error state with optional Retry and Back actions. */
export function PageError({
  message,
  onRetry,
  retryLabel = "Retry",
  onBack,
  backLabel = "Back",
  fullScreen = false,
}: PageErrorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-4 ${fullScreen ? "min-h-screen" : "min-h-[40vh]"}`}
    >
      <p className="text-destructive text-sm" role="alert">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry != null && (
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {onBack != null && (
          <Button variant="ghost" onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
