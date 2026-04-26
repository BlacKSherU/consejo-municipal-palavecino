/** Almacenamiento de sesión para /gestion-cmp/editar-markdown (mismo origen, panel admin). */

const SESSION = "cmp_md_session";
const RESULT = "cmp_md_result";

export type MarkdownEditorSession = {
  returnUrl: string;
  fieldId: string;
  value: string;
  label: string;
};

export type MarkdownEditorResult = {
  fieldId: string;
  value: string;
  savedAt: number;
};

export const MD_FIELD = {
  NOTICIAS_CREATE_BODY: "noticias-create-body",
  noticiasEditBody: (newsId: number) => `noticias-edit-body-${newsId}`,
  ABOUT_MISSION: "about-mission",
  ABOUT_VISION: "about-vision",
  ABOUT_BODY: "about-body",
} as const;

export function goToMarkdownEditor(s: MarkdownEditorSession): void {
  sessionStorage.setItem(SESSION, JSON.stringify(s));
  window.location.href = "/gestion-cmp/editar-markdown";
}

export function readMarkdownSession(): MarkdownEditorSession | null {
  const raw = sessionStorage.getItem(SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MarkdownEditorSession;
  } catch {
    return null;
  }
}

export function clearMarkdownSession(): void {
  sessionStorage.removeItem(SESSION);
}

export function writeMarkdownResult(r: MarkdownEditorResult): void {
  sessionStorage.setItem(RESULT, JSON.stringify(r));
}

export function getMarkdownResult(): MarkdownEditorResult | null {
  const raw = sessionStorage.getItem(RESULT);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as MarkdownEditorResult;
    if (typeof o.fieldId === "string" && typeof o.value === "string") {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearMarkdownResult(): void {
  sessionStorage.removeItem(RESULT);
}
