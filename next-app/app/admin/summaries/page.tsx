/**
 * Admin summaries page: table with pagination and optional user filter; delete action with confirmation.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { InlineError, InlineLoading } from "@/components/page-state";
import { TablePagination } from "@/components/table-pagination";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";

interface SummaryRow {
  id: string;
  userId: string;
  userName?: string;
  tldr: string;
  createdAt: string;
  hasSalarySgd: boolean;
  hasJdMatch: boolean;
}

interface ListResponse {
  summaries: SummaryRow[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminSummariesPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const limit = 20;

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/summaries?${params.toString()}`
      );
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError("Failed to load summaries");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [userIdFilter, page]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this summary?")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/v1/admin/summaries/${id}`);
      setData((d) =>
        d
          ? {
              ...d,
              summaries: d.summaries.filter((s) => s.id !== id),
              total: d.total - 1,
            }
          : null
      );
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminPageShell title="Summaries">
      <Card>
        <CardHeader>
          <CardTitle>All summaries</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Label htmlFor="userId">Filter by user ID</Label>
            <Input
              id="userId"
              placeholder="User ID (optional)"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="w-48"
            />
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
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">TL;DR</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">User</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Created</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Salary</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">JD match</th>
                      <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summaries.map((s) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="max-w-xs truncate py-2 pr-2 text-foreground" title={s.tldr}>
                          {s.tldr}
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">
                          {s.userName ?? s.userId}
                        </td>
                        <td className="py-2 pr-2 text-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-2 text-foreground">{s.hasSalarySgd ? "Yes" : "—"}</td>
                        <td className="py-2 pr-2 text-foreground">{s.hasJdMatch ? "Yes" : "—"}</td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id)}
                          >
                            <TrashIcon className="size-4" weight="regular" />
                          </Button>
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
