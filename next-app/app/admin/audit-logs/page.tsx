/**
 * Admin audit logs page: filterable table of audit log entries with pagination.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";

interface LogEntry {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ListResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (adminId.trim()) params.set("adminId", adminId.trim());
      if (action.trim()) params.set("action", action.trim());
      if (resourceType.trim()) params.set("resourceType", resourceType.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/audit-logs?${params.toString()}`
      );
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError("Failed to load logs");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [adminId, action, resourceType, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Audit logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log entries</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Label htmlFor="adminId" className="sr-only">
              Admin ID
            </Label>
            <Input
              id="adminId"
              placeholder="Admin ID"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="w-40"
            />
            <Label htmlFor="action" className="sr-only">
              Action
            </Label>
            <Input
              id="action"
              placeholder="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-32"
            />
            <Label htmlFor="resourceType" className="sr-only">
              Resource type
            </Label>
            <Input
              id="resourceType"
              placeholder="Resource type"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-32"
            />
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
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Time</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Admin</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Action</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Resource</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">ID</th>
                      <th className="pb-2 font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 text-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-2 font-mono text-muted-foreground text-xs">{log.adminId}</td>
                        <td className="py-2 pr-2 text-foreground">{log.action}</td>
                        <td className="py-2 pr-2 text-foreground">{log.resourceType}</td>
                        <td className="py-2 pr-2 font-mono text-muted-foreground text-xs">{log.resourceId ?? "—"}</td>
                        <td className="max-w-[200px] truncate py-2 text-muted-foreground text-xs">
                          {log.details ? JSON.stringify(log.details) : "—"}
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
