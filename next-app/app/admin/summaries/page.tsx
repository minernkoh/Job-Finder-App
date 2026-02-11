/**
 * Admin summaries page: table with pagination and optional user filter; delete action with confirmation.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { PageShell } from "@/components/page-shell";
import { InlineError, InlineLoading } from "@/components/page-state";
import { TablePagination } from "@/components/table-pagination";
import {
  AdminTable,
  adminTableBodyCellActionsClass,
  adminTableBodyCellClass,
  adminTableBodyRowClass,
} from "@/components/admin-table";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";
import { adminSummariesKeys } from "@/lib/query-keys";

interface SummaryRow {
  id: string;
  userId: string;
  userName: string;
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
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const limit = 20;
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error: fetchError,
  } = useQuery({
    queryKey: adminSummariesKeys(userIdFilter.trim(), page, limit),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/summaries?${params.toString()}`
      );
      if (!res.data.success || !res.data.data) throw new Error("Failed to load summaries");
      return res.data.data;
    },
  });
  const error = fetchError instanceof Error ? fetchError.message : null;

  const handleDeleteConfirm = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/v1/admin/summaries/${id}`);
      setDeleteConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "summaries"] });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell title="Summaries">
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
              <AdminTable
                headers={["TL;DR", "User", "Created", "Salary", "JD match", "Actions"]}
              >
                {data.summaries.map((s) => (
                  <tr key={s.id} className={adminTableBodyRowClass}>
                    <td
                      className={`max-w-xs truncate ${adminTableBodyCellClass}`}
                      title={s.tldr}
                    >
                      {s.tldr}
                    </td>
                    <td className={`${adminTableBodyCellClass} text-muted-foreground text-xs`}>
                      {s.userName || s.userId}
                    </td>
                    <td className={adminTableBodyCellClass}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className={adminTableBodyCellClass}>
                      {s.hasSalarySgd ? "Yes" : "—"}
                    </td>
                    <td className={adminTableBodyCellClass}>
                      {s.hasJdMatch ? "Yes" : "—"}
                    </td>
                    <td className={adminTableBodyCellActionsClass}>
                      <div className="flex items-center justify-end gap-0.5">
                        {deleteConfirmId === s.id ? (
                          <span className="flex items-center gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              disabled={deletingId === s.id}
                              onClick={() => handleDeleteConfirm(s.id)}
                            >
                              {deletingId === s.id ? "Deleting…" : "Confirm"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === s.id}
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === s.id}
                            onClick={() => setDeleteConfirmId(s.id)}
                            title="Delete summary"
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
