import { apiFetch } from "@/lib/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface SafeFetchOptions extends RequestInit {
  /** Timeout en ms. Por defecto 12s. */
  timeoutMs?: number;
  /** Reintentos automáticos sólo en errores de red / 5xx. Por defecto 0. */
  retries?: number;
}

/**
 * Wrapper de apiFetch con AbortController + timeout y JSON tipado.
 * Lanza ApiError con `status` y mensaje legible para el usuario.
 */
export async function safeFetchJson<T>(path: string, options: SafeFetchOptions = {}): Promise<T> {
  const { timeoutMs = 12_000, retries = 0, signal: extSignal, ...init } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
    const onExtAbort = () => ctrl.abort();
    if (extSignal) extSignal.addEventListener("abort", onExtAbort);

    try {
      const res = await apiFetch(path, { ...init, signal: ctrl.signal });
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          attempt++;
          continue;
        }
        let msg = `HTTP ${res.status}`;
        try {
          const j = (await res.clone().json()) as { error?: string; message?: string };
          if (j?.error) msg = j.error;
          else if (j?.message) msg = j.message;
        } catch {
          /* respuesta sin JSON */
        }
        throw new ApiError(humanizeError(res.status, msg), res.status);
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return undefined as unknown as T;
      return (await res.json()) as T;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        if (extSignal?.aborted) throw err;
        throw new ApiError("La solicitud tardó demasiado. Reintente.", 0);
      }
      if (err instanceof ApiError) throw err;
      if (attempt < retries) {
        attempt++;
        continue;
      }
      throw new ApiError("No se pudo contactar al servidor. Verifique su conexión.", 0);
    } finally {
      clearTimeout(timeoutId);
      if (extSignal) extSignal.removeEventListener("abort", onExtAbort);
    }
  }
}

function humanizeError(status: number, fallback: string): string {
  if (status === 401) return "Sesión expirada. Vuelva a iniciar sesión.";
  if (status === 403) return "No tiene permiso para realizar esta acción.";
  if (status === 404) return "El recurso solicitado no existe.";
  if (status === 409) return "Conflicto: el recurso ya existe o fue modificado.";
  if (status === 413) return "El archivo es demasiado grande.";
  if (status === 429) return "Demasiadas solicitudes. Espere un momento e intente de nuevo.";
  if (status >= 500) return "Error del servidor. Intente nuevamente en unos momentos.";
  return fallback || `Error ${status}`;
}
