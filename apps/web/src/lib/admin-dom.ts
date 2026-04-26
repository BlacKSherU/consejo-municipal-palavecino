/**
 * Cierre de etiqueta sin escribir `</` en fuentes .astro (el parser de Astro
 * y los literales con escape incorrecto rompen el HTML inyectado).
 */
export function ct(name: string): string {
  return "</" + name + ">";
}

export function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
