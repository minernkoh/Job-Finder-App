/**
 * Shared API error response helper. Used by route handlers to return consistent JSON error payloads.
 * Also exports getErrorMessage for client-side and lib/api catch blocks.
 */

import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { isValidObjectId } from "@/lib/objectid";

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
 * Returns true if the error message indicates Gemini API rate limit (429 or quota exhausted).
 * Safe for client use; no server-only imports.
 */
export function isRateLimitMessage(message: string): boolean {
  const m = message.toUpperCase();
  return (
    m.includes("429") ||
    m.includes("RESOURCE_EXHAUSTED") ||
    m.includes("QUOTA")
  );
}

/**
 * Asserts that an API response has success: true and defined data. Throws with response.message or fallbackError otherwise.
 */
export function assertApiSuccess<T>(
  response: { success: boolean; data?: T; message?: string },
  fallbackError: string
): asserts response is { success: true; data: T } {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message ?? fallbackError);
  }
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
 * Returns the first Zod issue message for use in API error payloads. Falls back to defaultMessage if no issues.
 */
export function validationMessageFromZod(
  zodError: z.ZodError,
  defaultMessage = "Invalid input"
): string {
  const first = zodError.issues[0];
  return first?.message ? String(first.message) : defaultMessage;
}

/**
 * Builds a 400 JSON response for Zod validation failures. Use when safeParse fails so all routes return the same shape.
 * The message is set to the first Zod error message so clients can show it via getErrorMessage.
 */
export function validationErrorResponse(
  zodError: z.ZodError,
  message = "Invalid input"
): NextResponse {
  const displayMessage = validationMessageFromZod(zodError, message);
  return NextResponse.json(
    { success: false, message: displayMessage, errors: zodError.flatten() },
    { status: 400 }
  );
}

/**
 * Validates a route param as required and valid ObjectId. Returns 400 NextResponse if missing or invalid; otherwise null.
 */
export function validateIdParam(
  id: string | undefined | null,
  paramLabel: string
): NextResponse | null {
  if (id == null || id === "") {
    return NextResponse.json(
      { success: false, message: `${paramLabel} required` },
      { status: 400 }
    );
  }
  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: `Invalid ${paramLabel}` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Parses request body as JSON. Returns [body, null] on success or [null, 400 NextResponse] on parse error.
 * Use in POST/PATCH handlers to avoid SyntaxError bubbling as 500.
 */
export async function parseJsonBody(
  request: NextRequest
): Promise<[unknown, null] | [null, NextResponse]> {
  try {
    const body = await request.json();
    return [body, null];
  } catch {
    return [
      null,
      NextResponse.json(
        { success: false, message: "Invalid or missing JSON body" },
        { status: 400 }
      ),
    ];
  }
}
