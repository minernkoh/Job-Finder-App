/**
 * Admin users page: table with search, role/status filters, pagination; create user form; links to user detail.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/page-shell";
import { InlineError, InlineLoading } from "@/components/page-state";
import { TablePagination } from "@/components/table-pagination";
import {
  AdminTable,
  adminTableBodyCellActionsClass,
  adminTableBodyCellClass,
  adminTableBodyRowClass,
} from "@/components/admin-table";
import { FormField } from "@/components/form-field";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@ui/components";
import { adminUsersKeys } from "@/lib/query-keys";

interface UserRow {
  id: string;
  email: string;
  username: string;
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
  email: "",
  username: "",
  password: "",
  role: "user" as "user" | "admin",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error: fetchError,
  } = useQuery({
    queryKey: adminUsersKeys(search.trim(), role, status, page, limit),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/users?${params.toString()}`
      );
      if (!res.data.success || !res.data.data) throw new Error("Failed to load users");
      return res.data.data;
    },
  });
  const error = fetchError
    ? (fetchError instanceof Error ? fetchError.message : getErrorMessage(fetchError, "Request failed"))
    : null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const usernameTrimmed = createForm.username.trim();
    if (usernameTrimmed.length < 3) {
      setCreateError("Username must be at least 3 characters");
      return;
    }
    setCreateSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { id: string; email: string; username: string; role: string } }>(
        "/api/v1/admin/users",
        {
          email: createForm.email.trim(),
          username: usernameTrimmed,
          password: createForm.password,
          role: createForm.role,
        }
      );
      if (res.data.success) {
        setCreateForm(defaultCreateForm);
        setCreateOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } else {
        setCreateError("Failed to create user");
      }
    } catch (e: unknown) {
      setCreateError(getErrorMessage(e, "Failed to create user"));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (userId: string) => {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const res = await apiClient.delete<{ success: boolean; message?: string }>(
        `/api/v1/admin/users/${userId}`
      );
      if (res.data.success) {
        setDeleteConfirmId(null);
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } else {
        setDeleteError(res.data.message ?? "Failed to delete user");
      }
    } catch (e) {
      setDeleteError(getErrorMessage(e, "Failed to delete user"));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Users"
      headerAction={
        <Button
          variant="default"
          size="sm"
          onClick={() => setCreateOpen(true)}
          iconRight={<PlusIcon size={18} weight="bold" />}
        >
          Create user
        </Button>
      }
    >
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              Create a user account. They can log in with this email and password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && <InlineError message={createError} />}
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
            <FormField id="create-username" label="Username" required>
              <Input
                id="create-username"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="3–30 chars, letters, numbers, _ -"
                required
                minLength={3}
                maxLength={30}
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
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                disabled={createSubmitting}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create user"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <span className="flex items-center gap-1 rounded-xl border border-input bg-background px-2">
                <MagnifyingGlassIcon className="size-4 text-muted-foreground" weight="regular" />
                <Input
                  id="search"
                  placeholder="Username or email..."
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
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
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
          {deleteError && <InlineError message={deleteError} />}
          {loading && !data && <InlineLoading />}
          {data && (
            <>
              <AdminTable
                headers={["Username", "Email", "Role", "Status", "Actions"]}
              >
                {data.users.map((u) => (
                  <tr key={u.id} className={adminTableBodyRowClass}>
                    <td className={adminTableBodyCellClass}>{u.username}</td>
                    <td className={adminTableBodyCellClass}>{u.email}</td>
                    <td className={adminTableBodyCellClass}>{u.role}</td>
                    <td className={adminTableBodyCellClass}>{u.status}</td>
                    <td className={adminTableBodyCellActionsClass}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {currentUser?.id === u.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            disabled
                            title="Cannot delete your own account"
                          >
                            <TrashIcon className="size-4" weight="regular" />
                          </Button>
                        ) : deleteConfirmId === u.id ? (
                          <span className="flex items-center gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              disabled={deleteSubmitting}
                              onClick={() => handleDeleteConfirm(u.id)}
                            >
                              {deleteSubmitting ? "Deleting…" : "Confirm"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deleteSubmitting}
                              onClick={() => {
                                setDeleteConfirmId(null);
                                setDeleteError(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(u.id)}
                            title="Delete user"
                          >
                            <TrashIcon className="size-4" weight="regular" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
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
    </PageShell>
  );
}
