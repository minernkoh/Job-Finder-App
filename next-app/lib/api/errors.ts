/**
 * Shared API error response helper. Used by route handlers to return consistent JSON error payloads.
 */

import { NextResponse } from "next/server";
import type { z } from "zod";

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
