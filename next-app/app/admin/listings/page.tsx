/**
 * Admin listings page: table of cached listings with pagination.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ui/components";

interface ListingRow {
  id: string;
  title: string;
  company: string;
  location?: string;
  country: string;
  sourceId: string;
  expiresAt: string;
  createdAt: string;
}

interface ListResponse {
  listings: ListingRow[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminListingsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/listings?${params.toString()}`
      );
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError("Failed to load listings");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Listings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cached listings</CardTitle>
          <p className="text-muted-foreground text-sm">Job listings from Adzuna cache.</p>
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
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Title</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Company</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Location</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Country</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.listings.map((l) => (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="max-w-xs truncate py-2 pr-2 text-foreground" title={l.title}>
                          {l.title}
                        </td>
                        <td className="py-2 pr-2 text-foreground">{l.company}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{l.location ?? "—"}</td>
                        <td className="py-2 pr-2 text-foreground">{l.country}</td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">
                          {new Date(l.expiresAt).toLocaleDateString()}
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
