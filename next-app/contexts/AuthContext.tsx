/**
 * Auth context: holds current user and token, and provides login/register/logout. Wraps the app so any component can read auth state.
 */

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  setAccessTokenGetter,
  setDemoModeGetter,
  setOnUnauthorized,
  setOnRefreshSuccess,
} from "@/lib/api/client";
import { DEMO_USER } from "@/lib/demo/constants";
import {
  clearDemoFlags,
  isDemoDismissed,
  setDemoActive,
  setDemoDismissed,
} from "@/lib/demo/session";
import { seedDemoStoreIfEmpty } from "@/lib/demo/store";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "user";
  username: string;
  aiEnabled?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  /** True when browsing as guest preview (local sandbox, no server session). */
  isDemo: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Enter guest preview manually (after exiting). */
  enterDemo: () => void;
  /** Leave guest preview and browse signed out. */
  exitDemo: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Wraps the app and provides user, token, login, register, logout. Call login/register from forms; use useAuth() to read state. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const isDemoRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const syncDemo = useCallback((active: boolean) => {
    isDemoRef.current = active;
    setIsDemo(active);
  }, []);

  const enterDemo = useCallback(() => {
    seedDemoStoreIfEmpty();
    setDemoActive(true);
    setDemoDismissed(false);
    setUser(DEMO_USER);
    setToken(null);
    syncDemo(true);
  }, [syncDemo]);

  const exitDemo = useCallback(() => {
    setDemoActive(false);
    setDemoDismissed(true);
    setUser(null);
    setToken(null);
    syncDemo(false);
    router.push("/browse");
  }, [router, syncDemo]);

  useEffect(() => {
    setAccessTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    setDemoModeGetter(() => isDemoRef.current);
  }, []);

  useEffect(() => {
    isDemoRef.current = isDemo;
  }, [isDemo]);

  useEffect(() => {
    setOnRefreshSuccess((newToken) => setToken(newToken));
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      if (isDemoRef.current) return;
      setToken(null);
      setUser(null);
      isDemoRef.current = false;
      setIsDemo(false);
      const redirect =
        typeof window !== "undefined"
          ? encodeURIComponent(
              window.location.pathname + window.location.search,
            )
          : "";
      router.push(redirect ? `/?auth=login&redirect=${redirect}` : "/?auth=login");
    });
  }, [router]);

  useEffect(() => {
    const init = async () => {
      try {
        const refreshRes = await apiClient.post<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );
        const newToken = refreshRes.data?.accessToken;
        if (newToken) {
          clearDemoFlags();
          setToken(newToken);
          const meRes = await apiClient.get<{ success: true; data: AuthUser }>(
            "/api/v1/users/me",
            { headers: { Authorization: `Bearer ${newToken}` } },
          );
          setUser(meRes.data.data);
          syncDemo(false);
          setIsLoading(false);
          return;
        }
      } catch {
        setUser(null);
        setToken(null);
      }

      if (!isDemoDismissed()) {
        enterDemo();
      } else {
        syncDemo(false);
      }
      setIsLoading(false);
    };
    void init();
  }, [enterDemo, syncDemo]);

  const login = useCallback(async (loginId: string, password: string) => {
    clearDemoFlags();
    const res = await apiClient.post<{ accessToken: string; user: AuthUser }>(
      "/api/v1/auth/login",
      { login: loginId, password, role: "user" },
    );
    setToken(res.data.accessToken);
    setUser(res.data.user);
    syncDemo(false);
  }, [syncDemo]);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      clearDemoFlags();
      const res = await apiClient.post<{ accessToken: string; user: AuthUser }>(
        "/api/v1/auth/register",
        { email, password, username: username.trim() },
      );
      if (!res.data?.accessToken || !res.data?.user) {
        throw new Error("Invalid response from server");
      }
      setToken(res.data.accessToken);
      setUser(res.data.user);
      syncDemo(false);
    },
    [syncDemo],
  );

  const logout = useCallback(async () => {
    if (isDemo) {
      exitDemo();
      return;
    }
    await apiClient.post("/api/v1/auth/logout").catch(() => {});
    setDemoDismissed(true);
    setToken(null);
    setUser(null);
    syncDemo(false);
    router.push("/");
  }, [isDemo, exitDemo, router, syncDemo]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isDemo,
      login,
      register,
      logout,
      enterDemo,
      exitDemo,
      setUser,
      setToken,
    }),
    [user, token, isLoading, isDemo, login, register, logout, enterDemo, exitDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Returns the current auth state and login/register/logout. Must be used inside a component that is wrapped by AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
