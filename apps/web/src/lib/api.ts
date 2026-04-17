/** Resuelve la base del API: meta (HTML), variable global o env de build. */
export function getApiBase(): string {
  if (typeof document !== "undefined") {
    const w = window as unknown as { __CMP_API_BASE__?: string };
    if (typeof w.__CMP_API_BASE__ === "string" && w.__CMP_API_BASE__.trim()) {
      return w.__CMP_API_BASE__.trim().replace(/\/$/, "");
    }
    const meta = document.querySelector('meta[name="cmp-api-base"]');
    const c = meta?.getAttribute("content")?.trim();
    if (c) return c.replace(/\/$/, "");
  }
  return (import.meta.env.PUBLIC_API_URL || "").replace(/\/$/, "");
}

/** URL absoluta o relativa al API. */
export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token =
    typeof window !== "undefined" ? window.sessionStorage.getItem("cmp_token") : null;
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
}
