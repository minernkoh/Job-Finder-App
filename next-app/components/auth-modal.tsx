/**
 * Auth modal: user log in / sign up in a modal when URL has ?auth=login or ?auth=signup. Close clears params; success navigates then clears params.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { XIcon } from "@phosphor-icons/react";
import { EASE_TRANSITION } from "@/lib/animations";
import {
  authCloseButtonClass,
  authModalNarrowWidthClass,
} from "@/components/auth-card";
import { AuthTabs, type AuthTab } from "@/components/auth-tabs";
import { getErrorMessage } from "@/lib/api/errors";
import { InlineError } from "@/components/page-state";
import { useAuth } from "@/contexts/AuthContext";
import { AuthFormFields } from "@/components/auth-form-fields";
import { validatePassword, validateUsername } from "@/lib/validation";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { CARD_PADDING_AUTH } from "@/lib/layout";

/** Builds pathname + search string without auth and redirect params. */
function stripAuthParams(
  pathname: string,
  searchParams: URLSearchParams,
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
}: {
  initialTab: AuthTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const { login, register, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
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
    [email, password, login, onSuccess],
  );

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setFieldErrors({});
      const usernameResult = validateUsername(username);
      if (!usernameResult.valid) {
        setError(usernameResult.error ?? "Invalid username");
        return;
      }
      const passwordResult = validatePassword(password);
      if (!passwordResult.valid) {
        setError(passwordResult.error ?? "Invalid password");
        return;
      }
      setSubmitting(true);
      try {
        await register(email, password, username.trim());
        onSuccess();
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Registration failed"));
        const data =
          err && typeof err === "object" && "response" in err
            ? (
                err as {
                  response?: {
                    data?: {
                      errors?: { fieldErrors?: Record<string, string[]> };
                    };
                  };
                }
              ).response?.data
            : undefined;
        const fieldErrorsFromApi = data?.errors?.fieldErrors;
        if (fieldErrorsFromApi && typeof fieldErrorsFromApi === "object") {
          setFieldErrors({
            username: fieldErrorsFromApi.username?.[0],
            email: fieldErrorsFromApi.email?.[0],
            password: fieldErrorsFromApi.password?.[0],
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, username, register, onSuccess],
  );

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const firstFocusable = el.querySelector<HTMLElement>(
      'button[aria-label="Close"], button:not([disabled]), input:not([disabled]), [href]',
    );
    firstFocusable?.focus();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const getFocusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
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
      className={`relative ${authModalNarrowWidthClass} overflow-hidden`}
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
      <CardContent className={cn("flex flex-col gap-6", CARD_PADDING_AUTH, "pt-0")}>
        <AuthTabs value={tab} onChange={setTab} />
        <div className="min-h-0 overflow-auto">
          {tab === "login" ? (
            <form
              id="modal-login-form"
              onSubmit={handleLogin}
              className="space-y-4"
            >
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
            </form>
          ) : (
            <form
              id="modal-signup-form"
              onSubmit={handleSignup}
              className="space-y-4"
            >
              <AuthFormFields
                mode="signup"
                idPrefix="modal-register-"
                email={email}
                onEmailChange={(e) => setEmail(e.target.value)}
                password={password}
                onPasswordChange={(e) => setPassword(e.target.value)}
                username={username}
                onUsernameChange={(e) => setUsername(e.target.value)}
                disabled={submitting || isLoading}
                usernameError={fieldErrors.username}
                emailError={fieldErrors.email}
                passwordError={fieldErrors.password}
              />
              {error && <InlineError message={error} />}
            </form>
          )}
        </div>
        <div className="pt-4">
          <Button
            type="submit"
            form={tab === "login" ? "modal-login-form" : "modal-signup-form"}
            variant="default"
            size="lg"
            className="w-full"
            disabled={submitting || isLoading}
          >
            {tab === "login"
              ? submitting
                ? "Logging in…"
                : "Login"
              : submitting
                ? "Creating account…"
                : "Register"}
          </Button>
        </div>
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
  const [dismissedAfterSuccess, setDismissedAfterSuccess] = useState(false);

  useEffect(() => {
    if (auth === "login" || auth === "signup") setDismissedAfterSuccess(false);
  }, [auth]);

  const closeModal = useCallback(() => {
    const next = stripAuthParams(pathname ?? "/", searchParams);
    router.replace(next);
  }, [pathname, router, searchParams]);

  const onSuccess = useCallback(() => {
    setDismissedAfterSuccess(true);
    router.replace(redirectTo);
  }, [router, redirectTo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  if ((auth !== "login" && auth !== "signup") || dismissedAfterSuccess)
    return null;

  const initialTab: AuthTab = auth === "signup" ? "signup" : "login";

  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={EASE_TRANSITION}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={EASE_TRANSITION}
        onClick={(e) => e.stopPropagation()}
        className={`flex ${authModalNarrowWidthClass} justify-center`}
      >
        <AuthModalContent
          initialTab={initialTab}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      </motion.div>
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
