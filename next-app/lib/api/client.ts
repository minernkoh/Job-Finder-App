/**
 * Axios client for API calls: sends cookies (withCredentials), adds Bearer token from auth, and retries on 401 by refreshing the token.
 */

import axios, { type AxiosError } from "axios";

const baseURL =
  typeof window !== "undefined"
    ? "" // same origin in browser
    : (process.env.NEXT_PUBLIC_API_URL ?? "");

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let getAccessToken: (() => string | null) | null = null;

/** Registers how to get the current access token so every request can add Authorization: Bearer. */
export function setAccessTokenGetter(getter: () => string | null) {
  getAccessToken = getter;
}

/** Returns the current access token (or null). Used by fetch-based helpers that bypass Axios (e.g. streaming). */
export function getCurrentAccessToken(): string | null {
  return getAccessToken?.() ?? null;
}

/** Builds headers for authenticated fetch (e.g. streaming). Content-Type plus Bearer token when available. */
export function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getCurrentAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken?.() ?? null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData needs multipart/form-data with boundary; don't override with application/json
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
let onRefreshSuccess: ((newToken: string) => void) | null = null;

/** Called when refresh fails; use this to redirect to login. */
export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

/** Called when refresh succeeds with a new token so the app can store it. */
export function setOnRefreshSuccess(callback: (newToken: string) => void) {
  onRefreshSuccess = callback;
}

/** Single in-flight refresh promise so concurrent 401s share one refresh call. */
let refreshPromise: Promise<string | null> | null = null;

/** Attempts to refresh the access token via the refresh endpoint. Returns new token or null. Used by fetch-based helpers (e.g. streaming) for 401 retry. Deduplicates concurrent refresh calls. */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { accessToken?: string };
        const token = json?.accessToken ?? null;
        if (token) onRefreshSuccess?.(token);
        return token;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config;
    if (!originalRequest || err.response?.status !== 401) {
      return Promise.reject(err);
    }
    // Do not redirect when the failing request was refresh (e.g. /admin should show its own form).
    const isRefreshRequest =
      originalRequest.url?.includes("auth/refresh") ?? false;
    // Avoid retry loop: if we already retried (e.g. refresh failed), redirect unless it was refresh
    if ((originalRequest as { _retry?: boolean })._retry) {
      if (!isRefreshRequest) onUnauthorized?.();
      return Promise.reject(err);
    }
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        (originalRequest as { _retry?: boolean })._retry = true;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    } catch {
      // Refresh failed
    }
    if (!isRefreshRequest) onUnauthorized?.();
    return Promise.reject(err);
  },
);
