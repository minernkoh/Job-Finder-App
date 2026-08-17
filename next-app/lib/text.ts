/**
 * Strip HTML to plain text for prompts. Shared so listings and summaries stay consistent.
 */

export function stripHtmlToText(html: string, maxChars = 30000): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxChars);
}
