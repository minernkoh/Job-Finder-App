/**
 * Small helpers shared by the scraper/API providers: HTML text stripping and a
 * bounded-concurrency map so per-card detail fetches don't fan out unbounded.
 */

const TAG_RE = /<[^>]+>/g;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Strips HTML tags and decodes the common entities, collapsing whitespace. Mirrors the japply CLI's _strip_html. */
export function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(TAG_RE, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Maps items through an async fn with at most `limit` in flight. Preserves input order. */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
