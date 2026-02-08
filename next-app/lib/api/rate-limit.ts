import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (request.ip) return request.ip;
  return "unknown";
}

/** In-memory rate limit guard (per instance). Returns NextResponse when blocked. */
export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  const key = `${options.keyPrefix ?? "global"}:${getClientKey(request)}`;
  const existing = store.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + options.windowMs };

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > options.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      {
        success: false,
        message: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return null;
}
