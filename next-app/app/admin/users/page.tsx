/**
 * Admin users page: table with search, role/status filters, pagination; links to user detail.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";

interface UserRow {
  id: string;
  name: string;
  email: string;
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

export default function AdminUsersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

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
      setError(
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Request failed")
          : "Request failed"
      );
    } finally {
      setLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Users</h1>
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
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {loading && !data && <p className="text-muted-foreground text-sm">Loading…</p>}
          {data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Name</th>
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
              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  {data.total} total · page {data.page} of {totalPages || 1}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <CaretLeftIcon className="size-4" weight="regular" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <CaretRightIcon className="size-4" weight="regular" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
