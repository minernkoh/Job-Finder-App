/**
 * Shared Gemini model factory and retry helper. Single source of truth for AI SDK usage.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getEnv } from "@/lib/env";

export const MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 1000;
/** Longer initial backoff for 429 rate limit errors (seconds). */
export const RATE_LIMIT_BACKOFF_MS = 5000;

export type GeminiModel = ReturnType<
  ReturnType<typeof createGoogleGenerativeAI>
>;

/** Returns true if the error indicates 429 rate limit or RESOURCE_EXHAUSTED. */
export function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const obj = err as {
      status?: number;
      statusCode?: number;
      message?: string;
      code?: string;
    };
    if (obj.status === 429 || obj.statusCode === 429) return true;
    const msg = String(obj.message ?? "").toUpperCase();
    const code = String(obj.code ?? "").toUpperCase();
    if (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("QUOTA")
    )
      return true;
    if (code.includes("RESOURCE_EXHAUSTED")) return true;
  }
  return false;
}

/** Returns the Gemini 2.5 Flash model. Throws if GEMINI_API_KEY is not set. */
export function getGeminiModel(): GeminiModel {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error("AI summarization is not configured");
  }
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

/** Returns the Gemini model or null if GEMINI_API_KEY is not set. Use when AI is optional (e.g. dashboard summary). */
export function getGeminiModelOptional(): GeminiModel | null {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) return null;
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

/** Runs an AI operation with the configured Gemini model (single key, no fallback). */
export async function executeWithGemini<T>(
  fn: (model: GeminiModel) => Promise<T>,
): Promise<T> {
  const model = getGeminiModel();
  return fn(model);
}

export interface RetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  /** Message used when all retries fail and last error is not an Error instance. */
  fallbackMessage?: string;
}

/**
 * Runs an async function with exponential backoff retries. Uses longer backoff for 429 rate limit errors.
 * On final failure, rethrows the last error or a new Error with fallbackMessage.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    initialBackoffMs = INITIAL_BACKOFF_MS,
    fallbackMessage = "Operation failed. Please try again.",
  } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const baseMs = isRateLimitError(err)
          ? RATE_LIMIT_BACKOFF_MS
          : initialBackoffMs;
        const delay = baseMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(fallbackMessage);
}
