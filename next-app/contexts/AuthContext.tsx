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
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  setAccessTokenGetter,
  setOnUnauthorized,
  setOnRefreshSuccess,
} from "@/lib/api/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Wraps the app and provides user, token, login, register, logout. Call login/register from forms; use useAuth() to read state. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setAccessTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    setOnRefreshSuccess((newToken) => setToken(newToken));
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
      const redirect =
        typeof window !== "undefined"
          ? encodeURIComponent(
              window.location.pathname + window.location.search
            )
          : "";
      router.push(redirect ? `/?auth=login&redirect=${redirect}` : "/?auth=login");
    });
  }, [router]);

  useEffect(() => {
    // Try refresh first (cookie); then fetch current user with new token
    const init = async () => {
      try {
        const refreshRes = await apiClient.post<{ accessToken: string }>(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true }
        );
        const newToken = refreshRes.data?.accessToken;
        if (newToken) {
          setToken(newToken);
          const meRes = await apiClient.get<AuthUser>("/api/v1/users/me", {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          setUser(meRes.data);
        }
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ accessToken: string; user: AuthUser }>(
      "/api/v1/auth/login",
      { email, password }
    );
    setToken(res.data.accessToken);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiClient.post<{ accessToken: string; user: AuthUser }>(
        "/api/v1/auth/register",
        { name, email, password }
      );
      setToken(res.data.accessToken);
      setUser(res.data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiClient.post("/api/v1/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
    router.push("/");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      setUser,
      setToken,
    }),
    [user, token, isLoading, login, register, logout]
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
