/**
 * Admin listings page: table of cached listings with pagination, Create form, Edit and Delete per row.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import {
  createListingApi,
  deleteListingApi,
  fetchListing,
  updateListingApi,
} from "@/lib/api/listings";
import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ui/components";

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

const defaultCreateForm: ListingCreate = {
  title: "",
  company: "",
  location: "",
  description: "",
  country: "sg",
  sourceUrl: "",
};

export default function AdminListingsPage() {
  const searchParams = useSearchParams();
  const editParam = searchParams?.get("edit") ?? null;

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ListingCreate>(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(editParam);
  const [editListing, setEditListing] = useState<ListingResult | null>(null);
  const [editForm, setEditForm] = useState<ListingUpdate>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  useEffect(() => {
    if (editParam && !editId) setEditId(editParam);
  }, [editParam, editId]);

  useEffect(() => {
    if (!editId) {
      setEditListing(null);
      setEditForm({});
      return;
    }
    let cancelled = false;
    setEditError(null);
    fetchListing(editId)
      .then((listing) => {
        if (!cancelled) {
          setEditListing(listing);
          setEditForm({
            title: listing.title,
            company: listing.company,
            location: listing.location ?? "",
            description: listing.description ?? "",
            country: listing.country,
            sourceUrl: listing.sourceUrl ?? undefined,
          });
        }
      })
      .catch((err) => {
        if (!cancelled)
          setEditError(err instanceof Error ? err.message : "Failed to load listing");
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await createListingApi({
        ...createForm,
        title: createForm.title.trim(),
        company: createForm.company.trim(),
        location: createForm.location?.trim() || undefined,
        description: createForm.description?.trim() || undefined,
        country: createForm.country || "sg",
        sourceUrl: createForm.sourceUrl?.trim() || undefined,
      });
      setCreateForm(defaultCreateForm);
      setCreateOpen(false);
      await fetchListings();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await updateListingApi(editId, {
        ...editForm,
        title: editForm.title?.trim(),
        company: editForm.company?.trim(),
        location: editForm.location?.trim() || undefined,
        description: editForm.description?.trim() || undefined,
        country: editForm.country || undefined,
        sourceUrl: editForm.sourceUrl?.trim() || undefined,
      });
      setEditId(null);
      await fetchListings();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeleteSubmitting(true);
    try {
      await deleteListingApi(id);
      setDeleteConfirmId(null);
      await fetchListings();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Listings</h1>
        <Button
          variant="default"
          size="sm"
          onClick={() => setCreateOpen((o) => !o)}
          iconRight={<PlusIcon size={18} weight="bold" />}
        >
          {createOpen ? "Cancel" : "Create listing"}
        </Button>
      </div>

      {createOpen && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>New listing</CardTitle>
            <p className="text-muted-foreground text-sm">
              Add a manual job listing. Required: title and company.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-xl">
              <div className="grid gap-2">
                <Label htmlFor="create-title">Title *</Label>
                <Input
                  id="create-title"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  placeholder="Job title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-company">Company *</Label>
                <Input
                  id="create-company"
                  value={createForm.company}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, company: e.target.value }))
                  }
                  required
                  placeholder="Company name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-location">Location</Label>
                <Input
                  id="create-location"
                  value={createForm.location ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g. Singapore"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-description">Description</Label>
                <textarea
                  id="create-description"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.description ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Job description (optional)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-country">Country (2-letter)</Label>
                <Input
                  id="create-country"
                  value={createForm.country ?? "sg"}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      country: e.target.value.slice(0, 2),
                    }))
                  }
                  placeholder="sg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-sourceUrl">Source URL</Label>
                <Input
                  id="create-sourceUrl"
                  type="url"
                  value={createForm.sourceUrl ?? ""}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, sourceUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              {createError && (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              )}
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {editId && editListing && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit listing</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditId(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditSubmit} className="space-y-4 max-w-xl">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editForm.title ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-company">Company *</Label>
                <Input
                  id="edit-company"
                  value={editForm.company ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, company: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editForm.location ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.description ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-country">Country (2-letter)</Label>
                <Input
                  id="edit-country"
                  value={editForm.country ?? "sg"}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      country: e.target.value.slice(0, 2),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sourceUrl">Source URL</Label>
                <Input
                  id="edit-sourceUrl"
                  type="url"
                  value={editForm.sourceUrl ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      sourceUrl: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              {editError && (
                <p className="text-sm text-destructive" role="alert">
                  {editError}
                </p>
              )}
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving…" : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cached listings</CardTitle>
          <p className="text-muted-foreground text-sm">
            Job listings from Adzuna cache and manual entries.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {loading && !data && (
            <p className="text-muted-foreground text-sm">Loading…</p>
          )}
          {data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Company
                      </th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Location
                      </th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Country
                      </th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Expires
                      </th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.listings.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-border/50"
                      >
                        <td
                          className="max-w-xs truncate py-2 pr-2 text-foreground"
                          title={l.title}
                        >
                          {l.title}
                        </td>
                        <td className="py-2 pr-2 text-foreground">
                          {l.company}
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {l.location ?? "—"}
                        </td>
                        <td className="py-2 pr-2 text-foreground">
                          {l.country}
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground text-xs">
                          {new Date(l.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => setEditId(l.id)}
                              title="Edit"
                            >
                              <PencilSimpleIcon size={16} />
                            </Button>
                            {deleteConfirmId === l.id ? (
                              <span className="flex items-center gap-1">
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={deleteSubmitting}
                                  onClick={() => handleDeleteConfirm(l.id)}
                                >
                                  {deleteSubmitting ? "Deleting…" : "Confirm"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deleteSubmitting}
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
                                onClick={() => setDeleteConfirmId(l.id)}
                                title="Delete"
                              >
                                <TrashIcon size={16} />
                              </Button>
                            )}
                          </div>
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
