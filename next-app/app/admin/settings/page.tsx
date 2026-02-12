/**
 * Admin settings page: account form (email, username, password) for admins. Rendered inside admin layout; no CompareBar.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageShell } from "@/components/page-shell";
import { EYEBROW_CLASS } from "@/lib/styles";

/** Admin settings: PageShell + Account section with shared account form. */
export default function AdminSettingsPage() {
  const { user, setUser } = useAuth();

  return (
    <PageShell title="Settings">
      <section aria-label="Account" className="space-y-3">
        <h2 className={EYEBROW_CLASS}>Account</h2>
        <AccountSettingsForm
          user={user}
          onSuccess={(data) => user && setUser({ ...user, email: data.email, username: data.username })}
          idPrefix="admin-settings"
        />
      </section>
    </PageShell>
  );
}
