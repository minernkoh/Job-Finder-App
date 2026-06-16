/**
 * Shared id helpers. Centralizes validity checks and parsing used by API routes and services.
 * Postgres primary keys are UUIDs, so these validate the UUID string form.
 * (File name kept as objectid.ts to avoid churn across import sites.)
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the string is a valid UUID; false otherwise.
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (id == null || typeof id !== "string") return false;
  return UUID_RE.test(id);
}

/**
 * Returns the id string if it is a valid UUID, or null otherwise.
 */
export function parseObjectId(id: string | undefined | null): string | null {
  return isValidObjectId(id) ? (id as string) : null;
}
