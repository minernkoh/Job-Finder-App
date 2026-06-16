/**
 * Supabase Postgres connection for the app. Use getSql() in API routes/services to run SQL.
 * Reuses one postgres.js client and caches it across hot reloads in development.
 *
 * The app keeps its own JWT auth and connects with the privileged Postgres role
 * (via DATABASE_URL) which bypasses RLS. For Vercel/serverless, point DATABASE_URL
 * at the Supabase connection pooler (Supavisor, transaction mode, port 6543) — that
 * is why prepared statements are disabled below.
 */

import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

/* Validated lazily (not at module load) so `next build` succeeds without env vars. */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Please define DATABASE_URL in .env (Supabase connection pooler string, e.g. postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres)"
    );
  }
  return url;
}

declare global {
  var __pgSql: Sql | undefined;
}

let client: Sql | undefined = global.__pgSql;

/** Returns the shared postgres.js client, creating it on first use. */
export function getSql(): Sql {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      // Required for the Supabase pooler in transaction mode (no prepared statements).
      prepare: false,
      // snake_case columns <-> camelCase JS keys in both results and sql(object) inserts.
      transform: postgres.camel,
      idle_timeout: 20,
      max: 10,
    });
    if (process.env.NODE_ENV !== "production") global.__pgSql = client;
  }
  return client;
}

/**
 * Compatibility helper for code that used the old Mongoose connectDB(). Returns the
 * postgres.js client (connection is established lazily on first query).
 */
export async function connectDB(): Promise<Sql> {
  return getSql();
}

/** Removes keys whose value is undefined so sql(object) inserts/updates only touch provided columns. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
