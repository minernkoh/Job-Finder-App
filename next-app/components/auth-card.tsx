/**
 * Shared auth card layout: same outer wrapper, card, title, and optional footer for login, register, and admin pages so they look consistent.
 */

interface AuthCardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Renders a centered card with title and optional footer; used by login, register, and admin auth pages. */
export function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-center text-2xl font-semibold text-foreground">
          {title}
        </h1>
        {children}
        {footer != null && footer}
      </div>
    </div>
  );
}
