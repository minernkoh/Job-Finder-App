/**
 * Admin user detail page: view user and activity counts; promote/demote, suspend/activate, delete with confirmation.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  UserCircleIcon,
  TrashIcon,
  CrownIcon,
  UserIcon,
  ProhibitIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ui/components";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summaryCount: number;
  savedCount: number;
  lastSummaryAt?: string;
  lastSavedAt?: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: UserDetail }>(
        `/api/v1/admin/users/${id}`
      );
      if (res.data.success && res.data.data) setUser(res.data.data);
      else setError("User not found");
    } catch {
      setError("Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateRole = async (role: "admin" | "user") => {
    setActionError(null);
    try {
      const res = await apiClient.patch<{ success: boolean }>(
        `/api/v1/admin/users/${id}/role`,
        { role }
      );
      if (res.data.success) {
        setUser((u) => (u ? { ...u, role } : null));
      } else {
        setActionError("Failed to update role");
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Request failed";
      setActionError(String(msg ?? "Request failed"));
    }
  };

  const updateStatus = async (status: "active" | "suspended") => {
    setActionError(null);
    try {
      const res = await apiClient.patch<{ success: boolean }>(
        `/api/v1/admin/users/${id}/status`,
        { status }
      );
      if (res.data.success) {
        setUser((u) => (u ? { ...u, status } : null));
      } else {
        setActionError("Failed to update status");
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Request failed";
      setActionError(String(msg ?? "Request failed"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await apiClient.delete(`/api/v1/admin/users/${id}`);
      router.replace("/admin/users");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Delete failed";
      setActionError(String(msg ?? "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-destructive" role="alert">
          {error ?? "User not found"}
        </p>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeftIcon className="size-4" weight="regular" />
            Back to users
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4" weight="regular" />
            Users
          </Button>
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">User detail</h1>
      {actionError && (
        <p className="text-destructive text-sm" role="alert">
          {actionError}
        </p>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <UserCircleIcon className="size-5 text-muted-foreground" weight="regular" />
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="text-foreground">{user.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-foreground">{user.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Summaries</dt>
              <dd className="text-foreground">{user.summaryCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Saved listings</dt>
              <dd className="text-foreground">{user.savedCount}</dd>
            </div>
            {user.lastSummaryAt && (
              <div>
                <dt className="text-muted-foreground">Last summary</dt>
                <dd className="text-foreground">{new Date(user.lastSummaryAt).toLocaleString()}</dd>
              </div>
            )}
            {user.lastSavedAt && (
              <div>
                <dt className="text-muted-foreground">Last saved</dt>
                <dd className="text-foreground">{new Date(user.lastSavedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <span className="text-muted-foreground text-sm">Actions:</span>
            {user.role === "admin" ? (
              <Button variant="outline" size="sm" onClick={() => updateRole("user")}>
                <UserIcon className="size-4" weight="regular" />
                Demote to user
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => updateRole("admin")}>
                <CrownIcon className="size-4" weight="regular" />
                Promote to admin
              </Button>
            )}
            {user.status === "active" ? (
              <Button variant="outline" size="sm" onClick={() => updateStatus("suspended")}>
                <ProhibitIcon className="size-4" weight="regular" />
                Suspend
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => updateStatus("active")}>
                <CheckCircleIcon className="size-4" weight="regular" />
                Activate
              </Button>
            )}
            {!confirmDelete ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <TrashIcon className="size-4" weight="regular" />
                Delete user
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Confirm delete?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  Yes, delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
