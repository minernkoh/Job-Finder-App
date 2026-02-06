/**
 * Admin page: sign up (admin) and log in, or dashboard with metrics and AI summary when admin is logged in.
 */

"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowClockwiseIcon,
  ChartBarIcon,
  FileTextIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { AuthCard } from "@/components/auth-card";
import { AuthTabs, type AuthTab } from "@/components/auth-tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
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
    totalListings: number;
    totalSummaries: number;
    totalSavedListings: number;
    summariesLast7Days: number;
    usersLast7Days: number;
    topSkillsFutureKeywords?: string[];
  };
  summary: string;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string; name: string; email: string; role: "admin" | "user" };
}

/** Extracts error message from API error response. */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (
      err as { response?: { data?: { error?: string; message?: string } } }
    ).response?.data;
    return data?.error ?? data?.message ?? fallback;
  }
  return fallback;
}

/** Admin dashboard: metrics cards and AI summary; fetches on mount and supports refresh. */
function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (refresh = false) => {
    const isRefresh = refresh;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/v1/admin/dashboard?refresh=1" : "/api/v1/admin/dashboard";
      const res = await apiClient.get<{ success: boolean; data: DashboardData }>(url);
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Dashboard unavailable"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive" role="alert">
          {error}
        </p>
        <Button variant="outline" onClick={() => fetchDashboard()}>
          Retry
        </Button>
        <Button variant="ghost" onClick={() => router.push("/admin")}>
          Back to admin
        </Button>
      </div>
    );
  }

  const m = data?.metrics;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            iconRight={
              refreshing ? undefined : (
                <ArrowClockwiseIcon className="size-4" weight="regular" />
              )
            }
          >
            {refreshing ? "Refreshing…" : "Refresh summary"}
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total users
              </CardTitle>
              <UsersIcon className="size-4 text-muted-foreground" weight="regular" />
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Listings
              </CardTitle>
              <ChartBarIcon className="size-4 text-muted-foreground" weight="regular" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{m?.totalListings ?? "—"}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI summaries
              </CardTitle>
              <FileTextIcon className="size-4 text-muted-foreground" weight="regular" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{m?.totalSummaries ?? "—"}</span>
              {m && m.summariesLast7Days > 0 && (
                <p className="text-xs text-muted-foreground">
                  +{m.summariesLast7Days} in last 7 days
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saved listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{m?.totalSavedListings ?? "—"}</span>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {data?.summary ?? "—"}
            </p>
          </CardContent>
        </Card>

        {m?.topSkillsFutureKeywords && m.topSkillsFutureKeywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top SkillsFuture keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {m.topSkillsFutureKeywords.join(", ")}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => router.push("/jobs")}>
            Go to jobs
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Admin sign up and log in form: two tabs; sign up uses admin secret; login only allows admin role. */
function AdminForm() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const { setToken, setUser, login, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : /[A-Z]/.test(password) && /[0-9]/.test(password)
          ? 3
          : 2;

  async function handleAdminSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<AuthResponse>(
        "/api/v1/auth/admin/register",
        { name, email, password, adminSecret },
        { withCredentials: true }
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
        { email, password },
        { withCredentials: true }
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
      title="Admin"
      hideTitle
      onClose={() => router.push("/jobs")}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Admin access only.
        </p>
      }
    >
      <AuthTabs value={tab} onChange={setTab} />

      {tab === "login" ? (
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-login-email">Email</Label>
            <Input
              id="admin-login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={submitting || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-login-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={submitting || isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="size-5" weight="regular" />
                ) : (
                  <EyeIcon className="size-5" weight="regular" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
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
          <div className="space-y-2">
            <Label htmlFor="admin-signup-name">Name</Label>
            <Input
              id="admin-signup-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={submitting || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-signup-email">Email</Label>
            <Input
              id="admin-signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={submitting || isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-signup-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={submitting || isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="size-5" weight="regular" />
                ) : (
                  <EyeIcon className="size-5" weight="regular" />
                )}
              </button>
            </div>
            {password.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Strength: {passwordStrength === 1 && "Weak (min 8 characters)"}
                {passwordStrength === 2 && "Medium (add uppercase and number)"}
                {passwordStrength === 3 && "Strong"}
              </p>
            )}
          </div>
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
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={submitting || isLoading}
            iconRight={
              !submitting ? (
                <ArrowRightIcon weight="bold" />
              ) : undefined
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user?.role === "admin") {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <AdminDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <AdminForm />
    </Suspense>
  );
}
