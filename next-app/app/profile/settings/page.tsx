/**
 * Profile settings page: account form (email, username, password) and delete-account section. Protected; reachable from user menu.
 */

"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { AppHeader } from "@/components/app-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageShell } from "@/components/page-shell";
import { CARD_PADDING_COMPACT, CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { EYEBROW_CLASS } from "@/lib/styles";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { deleteOwnAccount } from "@/lib/api/users";

/** Settings page content: header, compare bar, Account section, and Delete account section. */
function SettingsContent() {
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.id) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await deleteOwnAccount(user.id);
      await logout();
      router.push("/");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [user?.id, logout, router]);

  const handleOpenDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(true);
    setDeleteError(null);
  }, []);

  const handleCloseDeleteConfirm = useCallback(() => {
    if (!deleteSubmitting) {
      setDeleteConfirmOpen(false);
      setDeleteError(null);
    }
  }, [deleteSubmitting]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={logout} />

      <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP, PAGE_PX)}>
        <PageShell title="Settings">
          <section aria-label="Account" className="space-y-3">
            <h2 className={EYEBROW_CLASS}>Account</h2>
            <AccountSettingsForm
              user={user}
              onSuccess={(data) => user && setUser({ ...user, email: data.email, username: data.username })}
              idPrefix="settings"
            />
          </section>

          <section aria-label="Delete account" className="mt-8 space-y-3">
            <h2 className={cn(EYEBROW_CLASS, "text-destructive")}>Danger zone</h2>
            <Card variant="default" className="border-border border-destructive/50">
              <CardContent className={CARD_PADDING_COMPACT}>
                <p className="text-sm text-muted-foreground mb-4">
                  This permanently deletes your account and related data. This cannot be undone.
                </p>
                {deleteConfirmOpen ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">Are you sure you want to delete your account?</p>
                    {deleteError && (
                      <p className="text-sm text-destructive" role="alert">
                        {deleteError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        disabled={deleteSubmitting}
                        onClick={handleDeleteAccount}
                        aria-busy={deleteSubmitting}
                      >
                        {deleteSubmitting ? "Deleting…" : "Yes, delete my account"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={deleteSubmitting}
                        onClick={handleCloseDeleteConfirm}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleOpenDeleteConfirm}
                    aria-describedby="delete-account-desc"
                  >
                    <TrashIcon size={18} className="mr-2" aria-hidden />
                    Delete my account
                  </Button>
                )}
                <p id="delete-account-desc" className="sr-only">
                  Permanently delete your account and all related data.
                </p>
              </CardContent>
            </Card>
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
      <ProtectedRoute blockAdmins>
        <SettingsContent />
      </ProtectedRoute>
    </Suspense>
  );
}
