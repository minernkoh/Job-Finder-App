/**
 * Shared API error response helper. Used by route handlers to return consistent JSON error payloads.
 */

import { NextResponse } from "next/server";

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
