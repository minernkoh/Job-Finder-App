/**
 * Page shell: consistent layout with title, optional header action, and children.
 * Used by admin pages and user-facing pages (settings, summarize, compare, onboarding).
 */

"use client";

interface PageShellProps {
  title: string;
  children: React.ReactNode;
  /** Optional action shown next to the title (e.g. Create button, Back link). */
  headerAction?: React.ReactNode;
}

/** Renders page wrapper with h1 and optional header action; children provide the main content. */
export function PageShell({
  title,
  children,
  headerAction,
}: PageShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
