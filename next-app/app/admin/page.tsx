/**
 * Admin page: sign up (admin) and log in, or dashboard with metrics and AI summary when admin is logged in.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRightIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { AuthCard } from "@/components/auth-card";
import { AuthTabs, type AuthTab } from "@/components/auth-tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { AuthFormFields } from "@/components/auth-form-fields";
import { InlineError, PageError, PageLoading } from "@/components/page-state";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ui/components";

interface DashboardData {
  metrics: {
    totalUsers: number;
    totalSummaries: number;
    totalViews: number;
    totalSaves: number;
    summariesLast7Days: number;
    usersLast7Days: number;
    viewsLast7Days: number;
    savesLast7Days: number;
    activeUsersLast7Days?: number;
  };
  summary?: string;
  userGrowth: Array<{ date: string; count: number }>;
  popularListings: Array<{
    listingId: string;
    title?: string;
    viewCount: number;
    saveCount: number;
  }>;
  recentUsers: Array<{
    id: string;
    username: string;
    name: string;
    createdAt: string;
  }>;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; role: "admin" | "user"; username: string };
}

/** Admin dashboard: metrics cards and AI summary; loads dashboard first then summary for fast initial paint. */
function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingSummary, setRefreshingSummary] = useState(false);

  const fetchSummary = async (skipCache: boolean) => {
    setRefreshingSummary(true);
    try {
      const url = skipCache
        ? "/api/v1/admin/dashboard/summary?refresh=1"
        : "/api/v1/admin/dashboard/summary";
      const res = await apiClient.get<{
        success: boolean;
        data: { summary: string };
      }>(url);
      if (res.data.success && res.data.data?.summary !== undefined) {
        setData((prev) =>
          prev ? { ...prev, summary: res.data.data!.summary } : null
        );
      }
    } finally {
      setRefreshingSummary(false);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: DashboardData;
      }>("/api/v1/admin/dashboard?includeSummary=0");
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Dashboard unavailable"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!data || data.summary !== undefined) return;
    fetchSummary(false);
  }, [data]);

  if (loading && !data) {
    return (
      <PageLoading message="Loading dashboard…" fullScreen />
    );
  }

  if (error && !data) {
    return (
      <PageError
        message={error}
        onRetry={() => fetchDashboard()}
        retryLabel="Retry"
        onBack={() => router.push("/admin")}
        backLabel="Back to admin"
        fullScreen
      />
    );
  }

  const m = data?.metrics;
  return (
    <div className="min-h-0">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Admin Dashboard
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSummary(true)}
            disabled={refreshingSummary}
            iconRight={
              refreshingSummary ? undefined : (
                <ArrowClockwiseIcon className="size-4" weight="regular" />
              )
            }
          >
            {refreshingSummary ? "Refreshing…" : "Refresh summary"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {(() => {
                if (data?.summary !== undefined && data.summary !== "")
                  return data.summary;
                if (refreshingSummary) return "Refreshing…";
                if (data?.summary === "") return "—";
                return "Loading summary…";
              })()}
            </p>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-4">
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{m?.totalUsers ?? "—"}</span>
              {m && m.usersLast7Days > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{m.usersLast7Days} in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg AI summaries per user
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {m && m.totalUsers > 0
                  ? (m.totalSummaries / m.totalUsers).toFixed(1)
                  : "—"}
              </span>
              {m && m.summariesLast7Days > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{m.summariesLast7Days} in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg listing views per user
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {m && m.totalUsers > 0
                  ? (m.totalViews / m.totalUsers).toFixed(1)
                  : "—"}
              </span>
              {m && (
                <p className="text-xs text-muted-foreground">
                  {m.viewsLast7Days} views in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg saves per user
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {m && m.totalUsers > 0
                  ? (m.totalSaves / m.totalUsers).toFixed(1)
                  : "—"}
              </span>
              {m && (
                <p className="text-xs text-muted-foreground">
                  {m.savesLast7Days} saves in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {m?.activeUsersLast7Days ?? "—"}
              </span>
              <p className="text-xs text-muted-foreground">
                summary or save in last 7 days
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4">
          <Card>
            <CardHeader>
              <CardTitle>User growth (last 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.userGrowth && data.userGrowth.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {data.userGrowth.map((d) => (
                    <li key={d.date} className="flex justify-between">
                      <span className="text-foreground">{d.date}</span>
                      <span className="font-medium text-foreground">
                        {d.count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No new users in the last 7 days.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent users</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentUsers && data.recentUsers.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {data.recentUsers.map((u) => (
                    <li key={u.id} className="flex justify-between gap-2">
                      <span className="truncate text-foreground">
                        {u.username}
                      </span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No users yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Popular listings (views, last 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.popularListings && data.popularListings.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {data.popularListings.slice(0, 10).map((p) => (
                    <li key={p.listingId}>
                      <Link
                        href={`/browse/${p.listingId}`}
                        title={p.title ?? p.listingId}
                        className="flex justify-between rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate text-muted-foreground">
                          {p.title ?? p.listingId}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-foreground">
                          views: {p.viewCount}, saves: {p.saveCount}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No view data.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Admin sign up and log in form: two tabs; sign up uses admin secret; login only allows admin role. */
function AdminForm() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const { setToken, setUser, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdminSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<AuthResponse>(
        "/api/v1/auth/admin/register",
        { email, password, adminSecret, username: trimmedUsername },
        { withCredentials: true },
      );
      setToken(res.data.accessToken);
      setUser(res.data.user);
      window.location.href = "/admin";
    } catch (err) {
      setError(getErrorMessage(err, "Admin registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<AuthResponse>(
        "/api/v1/auth/login",
        { login: email, password, role: "admin" },
        { withCredentials: true },
      );
      if (res.data.user.role !== "admin") {
        setError("Not authorized for admin access");
        return;
      }
      setToken(res.data.accessToken);
      setUser(res.data.user);
      window.location.href = "/admin";
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Admin Log In"
      onClose={() => router.push("/browse")}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Create a user account with the same email at signup to browse jobs.
        </p>
      }
    >
      <AuthTabs value={tab} onChange={setTab} />

      {tab === "login" ? (
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <AuthFormFields
            mode="login"
            idPrefix="admin-login-"
            email={email}
            onEmailChange={(e) => setEmail(e.target.value)}
            password={password}
            onPasswordChange={(e) => setPassword(e.target.value)}
            disabled={submitting || isLoading}
          />
          {error && <InlineError message={error} />}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || isLoading}
          >
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleAdminSignup} className="space-y-4">
          <AuthFormFields
            mode="signup"
            idPrefix="admin-signup-"
            email={email}
            onEmailChange={(e) => setEmail(e.target.value)}
            password={password}
            onPasswordChange={(e) => setPassword(e.target.value)}
            username={username}
            onUsernameChange={(e) => setUsername(e.target.value)}
            disabled={submitting || isLoading}
          />
          <div className="space-y-2">
            <Label htmlFor="admin-signup-secret">Admin secret</Label>
            <Input
              id="admin-signup-secret"
              type="password"
              placeholder="Admin registration secret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              required
              autoComplete="off"
              disabled={submitting || isLoading}
            />
          </div>
          {error && <InlineError message={error} />}
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full"
            disabled={submitting || isLoading}
            iconRight={
              !submitting ? <ArrowRightIcon weight="bold" /> : undefined
            }
          >
            {submitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading fullScreen />;
  }

  if (user?.role === "admin") {
    return (
      <Suspense fallback={<PageLoading fullScreen />}>
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoading fullScreen />}>
      <AdminForm />
    </Suspense>
  );
}
