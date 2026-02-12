/**
 * Shared utilities for consuming NDJSON streams from API endpoints. Single source of truth for stream read-loop and error handling.
 */

import { buildAuthHeaders, refreshAccessToken } from "./client";

/**
 * POSTs to url with auth headers and optional body; returns the response body reader. On 401, attempts token refresh and retries once. Throws on non-ok or missing body.
 */
export async function createAuthenticatedStream(
  url: string,
  body?: unknown,
): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array> }> {
  const doFetch = (headers: Record<string, string>) =>
    fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const res = await doFetch(buildAuthHeaders());

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryRes = await doFetch({
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      });
      if (retryRes.ok && retryRes.body) {
        return { reader: retryRes.body.getReader() };
      }
      const errBody = await retryRes.json().catch(() => null);
      const message =
        (errBody as { message?: string } | null)?.message ??
        `Request failed (${retryRes.status})`;
      throw new Error(message);
    }
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const message =
      (errBody as { message?: string } | null)?.message ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (!res.body) throw new Error("No response body for stream");
  return { reader: res.body.getReader() };
}

/**
 * Reads an NDJSON stream and calls onPartial for each line. On _error line throws; on _complete line uses extractFinal to get the result and returns it.
 * extractFinal receives the parsed object (including _complete) and returns the final value of type T.
 */
export async function consumeNdjsonStream<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPartial: (partial: Partial<T>) => void,
  extractFinal: (parsed: Record<string, unknown>) => T,
  incompleteMessage = "Stream ended without a complete result",
): Promise<T> {
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: T | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;

      if (parsed._error) {
        throw new Error(String(parsed.message ?? "Stream generation failed"));
      }

      if (parsed._complete) {
        finalResult = extractFinal(parsed);
        onPartial(finalResult as Partial<T>);
        continue;
      }

      onPartial(parsed as Partial<T>);
    }

    if (done) break;
  }

  if (!finalResult) {
    throw new Error(incompleteMessage);
  }
  return finalResult;
}
