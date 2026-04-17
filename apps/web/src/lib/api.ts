/** Base URL for API (empty = same origin, e.g. proxied /api in dev or unified domain in prod). */
export function apiUrl(path: string): string {
  const base = (import.meta.env.PUBLIC_API_URL || "").replace(/\/$/, "");
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
