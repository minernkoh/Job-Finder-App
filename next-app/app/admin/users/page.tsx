/**
 * Admin users page: table with search, role/status filters, pagination; create user form; links to user detail.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { AdminPageShell } from "@/components/admin-page-shell";
import { InlineError, InlineLoading } from "@/components/page-state";
import { TablePagination } from "@/components/table-pagination";
import { FormField } from "@/components/form-field";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";

interface UserRow {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

const defaultCreateForm = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "user" as "user" | "admin",
};

export default function AdminUsersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/users?${params.toString()}`
      );
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError("Failed to load users");
    } catch (e) {
      setError(getErrorMessage(e, "Request failed"));
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { id: string; name: string; email: string; username?: string; role: string } }>(
        "/api/v1/admin/users",
        {
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          username: createForm.username?.trim() || undefined,
          password: createForm.password,
          role: createForm.role,
        }
      );
      if (res.data.success) {
        setCreateForm(defaultCreateForm);
        setCreateOpen(false);
        await fetchUsers();
      } else {
        setCreateError("Failed to create user");
      }
    } catch (e: unknown) {
      setCreateError(getErrorMessage(e, "Failed to create user"));
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      title="Users"
      headerAction={
        <Button
          variant="default"
          size="sm"
          onClick={() => setCreateOpen((o) => !o)}
          iconRight={<PlusIcon size={18} weight="bold" />}
        >
          {createOpen ? "Cancel" : "Create user"}
        </Button>
      }
    >
      {createOpen && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>New user</CardTitle>
            <p className="text-muted-foreground text-sm">
              Create a user account. They can log in with this email and password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && <InlineError message={createError} />}
              <FormField id="create-name" label="Name" required>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  required
                  disabled={createSubmitting}
                />
              </FormField>
              <FormField id="create-email" label="Email" required>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                  disabled={createSubmitting}
                />
              </FormField>
              <FormField id="create-username" label="Username (optional)">
                <Input
                  id="create-username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="3–30 chars, letters, numbers, _ -"
                  disabled={createSubmitting}
                />
              </FormField>
              <FormField id="create-password" label="Password" required>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  disabled={createSubmitting}
                />
              </FormField>
              <div className="grid gap-2">
                <Label htmlFor="create-role">Role</Label>
                <select
                  id="create-role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as "user" | "admin" }))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  disabled={createSubmitting}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <span className="flex items-center gap-1 rounded-md border border-input bg-background px-2">
                <MagnifyingGlassIcon className="size-4 text-muted-foreground" weight="regular" />
                <Input
                  id="search"
                  placeholder="Name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setPage(1)}
                  className="border-0 bg-transparent w-40"
                />
              </span>
            </div>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setPage(1)}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <InlineError message={error} />}
          {loading && !data && <InlineLoading />}
          {data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Name</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Username</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Email</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Role</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 text-foreground">{u.name}</td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">{u.username ?? "—"}</td>
                        <td className="py-2 pr-2 text-foreground">{u.email}</td>
                        <td className="py-2 pr-2 text-foreground">{u.role}</td>
                        <td className="py-2 pr-2 text-foreground">{u.status}</td>
                        <td className="py-2">
                          <Link href={`/admin/users/${u.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                total={data.total}
                page={data.page}
                limit={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
