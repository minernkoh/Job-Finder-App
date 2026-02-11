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
    <div className="flex gap-2 border-b border-border" role="tablist">
      <button
        type="button"
        role="tab"
        onClick={() => onChange("login")}
        className={`flex-1 px-4 pt-2 pb-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
          value === "login"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Log in
      </button>
      <button
        type="button"
        role="tab"
        onClick={() => onChange("signup")}
        className={`flex-1 px-4 pt-2 pb-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
          value === "signup"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Sign up
      </button>
    </div>
  );
}
