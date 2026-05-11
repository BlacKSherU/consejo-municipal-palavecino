import DOMPurify from "dompurify";
import { marked } from "marked";

const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    "a", "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "b", "i", "u", "s", "del", "mark", "small", "sub", "sup",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "span", "div",
  ],
  ALLOWED_ATTR: ["href", "title", "alt", "src", "target", "rel", "class", "id", "loading"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
} as unknown as Parameters<typeof DOMPurify.sanitize>[1];

/**
 * Convierte Markdown a HTML y sanea el resultado contra XSS.
 * Uso siempre obligatorio antes de inyectar con dangerouslySetInnerHTML / innerHTML.
 */
export function renderMarkdown(input: string | null | undefined): string {
  const text = (input ?? "").trim();
  if (!text) return "";
  const raw = marked.parse(text, { async: false }) as string;
  return sanitizeHtml(raw);
}

/** Sanea HTML arbitrario. Solo seguro de llamar en el navegador. */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const cleaned = DOMPurify.sanitize(html, SAFE_CONFIG);
  // Reforzar links externos: target=_blank → noopener
  if (typeof document !== "undefined") {
    const tpl = document.createElement("template");
    tpl.innerHTML = cleaned;
    tpl.content.querySelectorAll("a[target=_blank]").forEach((a) => {
      a.setAttribute("rel", "noopener noreferrer");
    });
    return tpl.innerHTML;
  }
  return cleaned;
}
