/**
 * Admin listings page: table of cached listings with pagination, Create form, Edit and Delete per row.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlusIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import {
  createListingApi,
  deleteListingApi,
  fetchListing,
  updateListingApi,
} from "@/lib/api/listings";
import { PageShell } from "@/components/page-shell";
import { InlineError, InlineLoading } from "@/components/page-state";
import { TablePagination } from "@/components/table-pagination";
import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ui/components";
import { ListingForm } from "@/components/listing-form";

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
  const [createForm, setCreateForm] =
    useState<ListingCreate>(defaultCreateForm);
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
        `/api/v1/admin/listings?${params.toString()}`,
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
          setEditError(
            err instanceof Error ? err.message : "Failed to load listing",
          );
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

  return (
    <PageShell
      title="Listings"
      headerAction={
        <Button
          variant="default"
          size="sm"
          onClick={() => setCreateOpen((o) => !o)}
          iconRight={<PlusIcon size={18} weight="bold" />}
        >
          {createOpen ? "Cancel" : "Create Listing"}
        </Button>
      }
    >
      {createOpen && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle>New listing</CardTitle>
            <p className="text-muted-foreground text-sm">
              Add a manual job listing. Required: title and company.
            </p>
          </CardHeader>
          <CardContent>
            <ListingForm
              mode="create"
              value={createForm}
              onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
              onSubmit={handleCreateSubmit}
              submitLabel="Create"
              submitting={createSubmitting}
              error={createError}
              idPrefix="create-"
            />
          </CardContent>
        </Card>
      )}

      {editId && editListing && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit listing</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <ListingForm
              mode="edit"
              value={{
                title: editForm.title ?? "",
                company: editForm.company ?? "",
                location: editForm.location ?? "",
                description: editForm.description ?? "",
                country: editForm.country ?? "sg",
                sourceUrl: editForm.sourceUrl ?? "",
              }}
              onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditId(null)}
              submitLabel="Save"
              submitting={editSubmitting}
              error={editError}
              idPrefix="edit-"
            />
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
          {error && <InlineError message={error} />}
          {loading && !data && <InlineLoading />}
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
                      <tr key={l.id} className="border-b border-border/50">
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
