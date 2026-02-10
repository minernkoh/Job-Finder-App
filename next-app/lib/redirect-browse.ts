/**
 * Shared helper for legacy /browser and /jobs redirects to /browse. Builds target URL with query string from searchParams.
 */

/**
 * Builds the full /browse path with query string from searchParams. Use with redirect() in legacy redirect pages.
 */
export function buildBrowseRedirectUrl(
  path: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    q.set(key, Array.isArray(value) ? value[0] : value);
  }
  const query = q.toString();
  return query ? `${path}?${query}` : path;
}
