/**
 * Builds a target URL with query string from searchParams. Use with redirect() in pages that preserve query params.
 */
export function buildRedirectUrl(
  targetPath: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    q.set(key, Array.isArray(value) ? value[0] : value);
  }
  const query = q.toString();
  return query ? `${targetPath}?${query}` : targetPath;
}
