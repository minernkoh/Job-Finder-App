/**
 * Profile settings page: account form (name, email, password). Protected; reachable from user menu.
 */

"use client";

import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageShell } from "@/components/page-shell";
import { CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { cn } from "@ui/components/lib/utils";

/** Settings page content: header, compare bar, and Account section with shared account form. */
function SettingsContent() {
  const { user, logout, setUser } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={logout} />
      <CompareBar />

      <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP, PAGE_PX)}>
        <PageShell title="Settings">
          <section aria-label="Account" className="space-y-3">
            <h2 className="eyebrow">Account</h2>
            <AccountSettingsForm
              user={user}
              onSuccess={(data) => user && setUser({ ...user, name: data.name, email: data.email, username: data.username })}
              idPrefix="settings"
            />
          </section>
        </PageShell>
      </main>
    </div>
  );
}

/** Settings page: protected; account form only. */
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <SettingsContent />
      </ProtectedRoute>
    </Suspense>
  );
}
