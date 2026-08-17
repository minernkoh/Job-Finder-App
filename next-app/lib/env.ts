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
  /** Master password users enter to unlock Gemini features. If unset, only admins have AI access. */
  AI_ACCESS_SECRET: z.string().optional(),
  /** Max Gemini calls per user per UTC day. Default 30. */
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).default(30),
  /** Max resume-tailor Gemini calls per user per UTC day. Default 10. */
  AI_TAILOR_DAILY_LIMIT: z.coerce.number().int().min(1).default(10),
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
    AI_ACCESS_SECRET: process.env.AI_ACCESS_SECRET?.trim() || undefined,
    AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT,
    AI_TAILOR_DAILY_LIMIT: process.env.AI_TAILOR_DAILY_LIMIT,
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
