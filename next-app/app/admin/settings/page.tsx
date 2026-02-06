/**
 * Admin settings page: view and edit system settings (cache TTL, rate limit, max listings per user).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { apiClient } from "@/lib/api/client";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ui/components";

interface SettingsData {
  cacheTTL?: number;
  rateLimitPerMinute?: number;
  maxListingsPerUser?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    cacheTTL: "",
    rateLimitPerMinute: "",
    maxListingsPerUser: "",
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: SettingsData }>(
        "/api/v1/admin/system/settings"
      );
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setData(d);
        setForm({
          cacheTTL: d.cacheTTL != null ? String(d.cacheTTL) : "",
          rateLimitPerMinute: d.rateLimitPerMinute != null ? String(d.rateLimitPerMinute) : "",
          maxListingsPerUser: d.maxListingsPerUser != null ? String(d.maxListingsPerUser) : "",
        });
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, number> = {};
      if (form.cacheTTL.trim() !== "") {
        const n = Number(form.cacheTTL);
        if (!Number.isFinite(n) || n < 0) throw new Error("cacheTTL must be a non-negative number");
        body.cacheTTL = n;
      }
      if (form.rateLimitPerMinute.trim() !== "") {
        const n = Number(form.rateLimitPerMinute);
        if (!Number.isFinite(n) || n < 1) throw new Error("rateLimitPerMinute must be at least 1");
        body.rateLimitPerMinute = n;
      }
      if (form.maxListingsPerUser.trim() !== "") {
        const n = Number(form.maxListingsPerUser);
        if (!Number.isFinite(n) || n < 0) throw new Error("maxListingsPerUser must be non-negative");
        body.maxListingsPerUser = n;
      }
      const res = await apiClient.patch<{ success: boolean; data: SettingsData }>(
        "/api/v1/admin/system/settings",
        body
      );
      if (res.data.success && res.data.data) {
        setData(res.data.data);
        setSaved(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <CheckCircleIcon className="size-4" weight="regular" />
          Settings saved.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>System settings</CardTitle>
          {data?.updatedAt && (
            <p className="text-muted-foreground text-xs">
              Last updated: {new Date(data.updatedAt).toLocaleString()}
              {data.updatedBy && ` by ${data.updatedBy}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cacheTTL">Cache TTL (seconds, optional)</Label>
              <Input
                id="cacheTTL"
                type="number"
                min={0}
                value={form.cacheTTL}
                onChange={(e) => setForm((f) => ({ ...f, cacheTTL: e.target.value }))}
                className="mt-1 max-w-xs"
              />
            </div>
            <div>
              <Label htmlFor="rateLimitPerMinute">Rate limit per minute (optional)</Label>
              <Input
                id="rateLimitPerMinute"
                type="number"
                min={1}
                value={form.rateLimitPerMinute}
                onChange={(e) => setForm((f) => ({ ...f, rateLimitPerMinute: e.target.value }))}
                className="mt-1 max-w-xs"
              />
            </div>
            <div>
              <Label htmlFor="maxListingsPerUser">Max listings per user (optional)</Label>
              <Input
                id="maxListingsPerUser"
                type="number"
                min={0}
                value={form.maxListingsPerUser}
                onChange={(e) => setForm((f) => ({ ...f, maxListingsPerUser: e.target.value }))}
                className="mt-1 max-w-xs"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
