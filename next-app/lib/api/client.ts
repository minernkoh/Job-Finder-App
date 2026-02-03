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

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken?.() ?? null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      const refreshRes = await axios.post(
        `${baseURL}/api/v1/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = refreshRes.data?.accessToken;
      if (newToken) {
        onRefreshSuccess?.(newToken);
        (originalRequest as { _retry?: boolean })._retry = true;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    } catch {
      // Refresh failed
    }
    if (!isRefreshRequest) onUnauthorized?.();
    return Promise.reject(err);
  }
);
