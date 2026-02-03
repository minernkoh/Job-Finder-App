/**
 * Jobs page: requires login. Shows user name and logout; job listings feed coming later.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@ui/components";

/** Inner content: header with user name and logout, placeholder for listings. */
function JobsContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-4xl items-center justify-between border-b border-border py-4">
        <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl py-8">
        <p className="text-muted-foreground">Job listings feed coming soon</p>
      </main>
    </div>
  );
}

/** Jobs page: wrapped in ProtectedRoute so only logged-in users see it; shows JobsContent. */
export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsContent />
    </ProtectedRoute>
  );
}
