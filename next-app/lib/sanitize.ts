import DOMPurify from "isomorphic-dompurify";

/** Sanitizes job description HTML for safe display. */
export function sanitizeJobDescription(html: string): string {
  if (!html?.trim()) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "strong",
      "b",
      "em",
      "i",
      "a",
      "h1",
      "h2",
      "h3",
    ],
    ADD_ATTR: ["href", "target", "rel"],
  }).trim();
}
