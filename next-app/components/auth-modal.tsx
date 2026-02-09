/**
 * Auth modal: user log in / sign up in a modal when URL has ?auth=login or ?auth=signup. Close clears params; success navigates then clears params.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowRightIcon, XIcon } from "@phosphor-icons/react";
import { authCloseButtonClass } from "@/components/auth-card";
import { AuthTabs, type AuthTab } from "@/components/auth-tabs";
import { getErrorMessage } from "@/lib/api/errors";
import { InlineError } from "@/components/page-state";
import { useAuth } from "@/contexts/AuthContext";
import { AuthFormFields } from "@/components/auth-form-fields";
import { Button, Card, CardContent } from "@ui/components";

/** Builds pathname + search string without auth and redirect params. */
function stripAuthParams(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const next = new URLSearchParams(searchParams);
  next.delete("auth");
  next.delete("redirect");
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Modal content: tabs and login/signup forms; used when auth=login or auth=signup. */
function AuthModalContent({
  initialTab,
  onClose,
  onSuccess,
  onSignupSuccess,
}: {
  initialTab: AuthTab;
  onClose: () => void;
  onSuccess: () => void;
  /** Called after signup; redirects to onboarding with return URL. */
  onSignupSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const { login, register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await login(email, password);
        onSuccess();
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Login failed"));
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, login, onSuccess]
  );

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await register(name, email, password, username?.trim() || undefined);
        onSignupSuccess();
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Registration failed"));
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, password, username, register, onSignupSuccess]
  );

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const firstFocusable = el.querySelector<HTMLElement>(
      'button[aria-label="Close"], button:not([disabled]), input:not([disabled]), [href]'
    );
    firstFocusable?.focus();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const getFocusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((node) => node.tabIndex !== -1);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Card
      ref={contentRef}
      variant="elevated"
      className="relative w-full max-w-lg overflow-hidden"
    >
      {/* Header strip: close only; no top border to match minimal look. */}
      <div className="relative min-h-[3rem] rounded-t-2xl flex items-center justify-end pr-2 py-2">
        <button
          type="button"
          onClick={onClose}
          className={authCloseButtonClass}
          aria-label="Close"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      <CardContent className="min-h-[18rem] space-y-6 p-10">
        <AuthTabs value={tab} onChange={setTab} />
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <AuthFormFields
              mode="login"
              idPrefix="modal-login-"
              email={email}
              onEmailChange={(e) => setEmail(e.target.value)}
              password={password}
              onPasswordChange={(e) => setPassword(e.target.value)}
              disabled={submitting || isLoading}
            />
            {error && <InlineError message={error} />}
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={submitting || isLoading}
            >
              {submitting ? "Logging in…" : "Login"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <AuthFormFields
              mode="signup"
              idPrefix="modal-register-"
              email={email}
              onEmailChange={(e) => setEmail(e.target.value)}
              password={password}
              onPasswordChange={(e) => setPassword(e.target.value)}
              name={name}
              onNameChange={(e) => setName(e.target.value)}
              username={username}
              onUsernameChange={(e) => setUsername(e.target.value)}
              disabled={submitting || isLoading}
            />
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
              {submitting ? "Creating account…" : "Register"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/** Reads URL auth param and renders modal when auth=login or auth=signup. Must be inside AuthProvider and under Suspense if used in layout. */
export function AuthModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam ?? pathname ?? "/";

  const closeModal = useCallback(() => {
    const next = stripAuthParams(pathname ?? "/", searchParams);
    router.replace(next);
  }, [pathname, router, searchParams]);

  const onSuccess = useCallback(() => {
    router.replace(redirectTo);
  }, [router, redirectTo]);

  const onSignupSuccess = useCallback(() => {
    router.replace(`/onboarding?redirect=${encodeURIComponent(redirectTo)}`);
  }, [router, redirectTo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  if (auth !== "login" && auth !== "signup") return null;

  const initialTab: AuthTab = auth === "signup" ? "signup" : "login";

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <AuthModalContent
          initialTab={initialTab}
          onClose={closeModal}
          onSuccess={onSuccess}
          onSignupSuccess={onSignupSuccess}
        />
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
