/**
 * Admin listings page: table of cached listings with pagination, Create form, Edit and Delete per row.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeIcon, PlusIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
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
import {
  AdminTable,
  adminTableBodyCellActionsClass,
  adminTableBodyCellClass,
  adminTableBodyRowClass,
} from "@/components/admin-table";
import type { ListingCreate, ListingResult, ListingUpdate } from "@schemas";
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
} from "@ui/components";
import { ListingForm } from "@/components/listing-form";
import { adminListingsKeys } from "@/lib/query-keys";

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

/** Builds pathname + search string without the edit param (for closing edit modal). */
function stripEditParam(pathname: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete("edit");
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export default function AdminListingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editParam = searchParams?.get("edit") ?? null;

  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error: fetchError,
    refetch: refetchListings,
  } = useQuery({
    queryKey: adminListingsKeys(page, limit),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await apiClient.get<{ success: boolean; data: ListResponse }>(
        `/api/v1/admin/listings?${params.toString()}`
      );
      if (!res.data.success || !res.data.data) throw new Error("Failed to load listings");
      return res.data.data;
    },
  });
  const error = fetchError instanceof Error ? fetchError.message : null;

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

  /** When true, the next editParam/editId sync effect run should skip (used after successful save so modal stays closed). */
  const skipNextEditParamSync = useRef(false);

  useEffect(() => {
    if (skipNextEditParamSync.current) {
      skipNextEditParamSync.current = false;
      return;
    }
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
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
      clearEditParam();
      skipNextEditParamSync.current = true;
      setEditId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  };

  const clearEditParam = useCallback(() => {
    router.replace(stripEditParam(pathname ?? "/admin/listings", searchParams ?? new URLSearchParams()));
  }, [pathname, router, searchParams]);

  const handleEditOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setEditId(null);
        clearEditParam();
      }
    },
    [clearEditParam]
  );

  const handleDeleteConfirm = async (id: string) => {
    setDeleteSubmitting(true);
    try {
      await deleteListingApi(id);
      setDeleteConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "listings"] });
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
          onClick={() => setCreateOpen(true)}
          iconRight={<PlusIcon size={18} weight="bold" />}
        >
          Create Listing
        </Button>
      }
    >
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New listing</DialogTitle>
            <DialogDescription>
              Add a manual job listing. Required: title and company.
            </DialogDescription>
          </DialogHeader>
          <ListingForm
            mode="create"
            value={createForm}
            onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create"
            submitting={createSubmitting}
            error={createError}
            idPrefix="create-"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
            <DialogDescription>
              Update the job listing details below.
            </DialogDescription>
          </DialogHeader>
          {editListing && (
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
              onCancel={() => handleEditOpenChange(false)}
              submitLabel="Save"
              submitting={editSubmitting}
              error={editError}
              idPrefix="edit-"
            />
          )}
          {editId && !editListing && editError && (
            <InlineError message={editError} />
          )}
          {editId && !editListing && !editError && <InlineLoading />}
        </DialogContent>
      </Dialog>

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
              <AdminTable
                headers={[
                  "Title",
                  "Company",
                  "Location",
                  "Country",
                  "Expires",
                  "Actions",
                ]}
              >
                {data.listings.map((l) => (
                  <tr key={l.id} className={adminTableBodyRowClass}>
                    <td
                      className={`max-w-xs truncate ${adminTableBodyCellClass}`}
                      title={l.title}
                    >
                      {l.title}
                    </td>
                    <td className={adminTableBodyCellClass}>{l.company}</td>
                    <td
                      className={`${adminTableBodyCellClass} text-muted-foreground`}
                    >
                      {l.location ?? "—"}
                    </td>
                    <td className={adminTableBodyCellClass}>{l.country}</td>
                    <td
                      className={`${adminTableBodyCellClass} text-muted-foreground text-xs`}
                    >
                      {new Date(l.expiresAt).toLocaleDateString()}
                    </td>
                    <td className={adminTableBodyCellActionsClass}>
                      <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              asChild
                              title="View"
                            >
                              <Link href={`/admin/listings/${l.id}`}>
                                <EyeIcon className="size-4" weight="regular" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => {
                                setEditId(l.id);
                                const next = new URLSearchParams(searchParams?.toString() ?? "");
                                next.set("edit", l.id);
                                router.replace(`${pathname ?? "/admin/listings"}?${next.toString()}`);
                              }}
                              title="Edit"
                            >
                          <PencilSimpleIcon className="size-4" weight="regular" />
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
