/**
 * Validates environment variables at startup so missing or invalid config fails fast. Used by auth and DB.
 */

import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),
  /** Adzuna listing cache TTL in seconds. Default 7 days (604800). */
  JOB_SEARCH_CACHE_TTL: z.coerce.number().default(604800),
  /** Optional so app starts without it; summary endpoints return 503 if unset. */
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** Cache TTL for AI summaries by inputTextHash (seconds). Default 7 days. */
  AI_SUMMARY_CACHE_TTL: z.coerce.number().default(604800),
  /** Node environment (development, production, etc.). Used by Next.js and cookie secure flag. */
  NODE_ENV: z.string().optional(),
  /** If set, allows creating an admin via POST /api/v1/auth/admin/register; if unset, that endpoint returns 403. */
  ADMIN_REGISTER_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
    JOB_SEARCH_CACHE_TTL: process.env.JOB_SEARCH_CACHE_TTL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
    AI_SUMMARY_CACHE_TTL: process.env.AI_SUMMARY_CACHE_TTL,
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_REGISTER_SECRET: process.env.ADMIN_REGISTER_SECRET,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.flatten().fieldErrors as unknown as string}`
    );
  }
  return parsed.data;
}

let _env: Env | null = null;

/** Returns validated env (validates on first use so API routes get a clear error if .env is wrong). */
export function getEnv(): Env {
  if (!_env) _env = validateEnv();
  return _env;
}
