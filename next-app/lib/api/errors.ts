/**
 * Shared API error response helper. Used by route handlers to return consistent JSON error payloads.
 * Also exports getErrorMessage for client-side and lib/api catch blocks.
 */

import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Extracts a user-facing error message from an unknown error. Checks response?.data?.message or
 * response?.data?.error (Axios-style), then err.message if Error, otherwise fallback.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (
      err as { response?: { data?: { error?: string; message?: string } } }
    ).response?.data;
    return data?.error ?? data?.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

/**
 * Builds a JSON error response from a caught error. Uses err.message if err is an Error, otherwise defaultMessage. Default status is 500.
 */
export function toErrorResponse(
  err: unknown,
  defaultMessage: string,
  status = 500
): NextResponse {
  const message = err instanceof Error ? err.message : defaultMessage;
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Builds a 400 JSON response for Zod validation failures. Use when safeParse fails so all routes return the same shape.
 */
export function validationErrorResponse(
  zodError: z.ZodError,
  message = "Invalid input"
): NextResponse {
  return NextResponse.json(
    { success: false, message, errors: zodError.flatten() },
    { status: 400 }
  );
}
