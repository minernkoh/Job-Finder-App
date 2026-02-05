/**
 * Admin page: separate sign up (admin) and log in. Not linked from the main app. Sign up requires admin secret; login accepts only admin users.
 */

"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { AuthCard } from "@/components/auth-card";
import { AuthTabs, type AuthTab } from "@/components/auth-tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Button, Input, Label } from "@ui/components";

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
      window.location.href = "/jobs";
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
      window.location.href = "/jobs";
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
