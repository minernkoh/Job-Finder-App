/**
 * Admin settings page: account form (name, email, password) for admins. Rendered inside admin layout; no CompareBar.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { AdminPageShell } from "@/components/admin-page-shell";

/** Admin settings: PageShell + Account section with shared account form. */
export default function AdminSettingsPage() {
  const { user, setUser } = useAuth();

  return (
    <AdminPageShell title="Settings">
      <section aria-label="Account" className="space-y-3">
        <h2 className="eyebrow">Account</h2>
        <AccountSettingsForm
          user={user}
          onSuccess={(data) => user && setUser({ ...user, name: data.name, email: data.email, username: data.username })}
          idPrefix="admin-settings"
        />
      </section>
    </AdminPageShell>
  );
}
