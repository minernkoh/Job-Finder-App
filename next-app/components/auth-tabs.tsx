/**
 * Shared Log in / Sign up tab bar for user and admin auth pages so the tab strip looks and behaves the same.
 */

export type AuthTab = "login" | "signup";

interface AuthTabsProps {
  value: AuthTab;
  onChange: (tab: AuthTab) => void;
}

/** Renders Log in and Sign up tabs with consistent styling; used by login and admin auth pages. */
export function AuthTabs({ value, onChange }: AuthTabsProps) {
  return (
    <div className="flex gap-2 rounded-xl border border-border p-1">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          value === "login"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() => onChange("signup")}
        className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          value === "signup"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Sign up
      </button>
    </div>
  );
}
