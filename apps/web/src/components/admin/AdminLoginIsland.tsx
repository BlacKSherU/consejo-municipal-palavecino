import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiFetch, apiUrl, getApiBase } from "@/lib/api";
import { emailSchema } from "@/lib/validators-ve";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function AdminLoginIsland() {
  const [diagUrl, setDiagUrl] = useState("…");
  const [warn, setWarn] = useState<string | null>(null);
  const [testOut, setTestOut] = useState<{ className: string; text: string } | null>(null);
  const [formError, setFormError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const base = getApiBase();
    setDiagUrl(
      base
        ? base
        : "(sin base) — las peticiones a /api van a este mismo dominio (Pages). Fuerza recarga (Ctrl+F5) o despliega el último build; el proyecto ya incluye la URL del Worker en el HTML.",
    );
    const host = window.location.hostname;
    if ((host.endsWith(".pages.dev") || host.endsWith(".pages.cloudflare.com")) && !base) {
      setWarn(
        "Sigue sin detectarse la base del API en esta página. Comprueba que abres la URL publicada de Pages (no una copia en otro host) y que el despliegue terminó. Opcional en Pages: PUBLIC_API_URL = tu Worker.",
      );
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = sessionStorage.getItem("cmp_token");
      if (!token) return;
      try {
        const res = await apiFetch("/api/auth/me");
        const data = (await res.json()) as { user?: unknown };
        if (data.user) window.location.replace("/gestion-cmp");
      } catch {
        sessionStorage.removeItem("cmp_token");
      }
    })();
  }, []);

  async function testHealth() {
    setTestOut({ className: "mt-2 text-[11px] text-amber-400", text: "Probando…" });
    const url = apiUrl("/health");
    try {
      const res = await fetch(url, { method: "GET", mode: "cors" });
      const text = await res.text();
      const looksLikeHtml = /^\s*</.test(text);
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text));
      } catch {
        /* ok */
      }
      const htmlHint =
        looksLikeHtml && res.ok
          ? " · Respuesta HTML (no es /health del Worker): la base del API está vacía o la URL no llega al Worker."
          : "";
      setTestOut({
        className: "mt-2 text-[11px] " + (res.ok && !looksLikeHtml ? "text-emerald-400" : "text-amber-400"),
        text: `${res.status} ${res.statusText} · ${url} → ${body.slice(0, 120)}${htmlHint}`,
      });
    } catch (e) {
      setTestOut({
        className: "mt-2 text-[11px] text-red-400",
        text: `Fallo: ${e instanceof Error ? e.message : String(e)}. URL: ${url}. Si es CORS, en el Worker define CORS_ORIGIN exactamente como https://${window.location.host} (sin barra final).`,
      });
    }
  }

  async function onSubmit(values: LoginValues) {
    setFormError("");
    const loginUrl = apiUrl("/api/auth/login");
    try {
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const raw = await res.text();
      let data: { error?: string; token?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { error?: string; token?: string }) : {};
      } catch {
        const base = getApiBase();
        if ((res.status === 405 || res.status === 404) && !base) {
          setFormError(
            `Error ${res.status} (respuesta no JSON): suele indicar que el POST fue a Pages sin API. ` +
              `En Cloudflare Pages → Settings → Environment variables → Production, define PUBLIC_API_URL = la URL del Worker (https://…workers.dev, sin / al final) y vuelve a desplegar.`,
          );
        } else {
          setFormError(`Respuesta no JSON (${res.status}). ¿URL correcta? ${loginUrl.slice(0, 80)}…`);
        }
        return;
      }
      if (!res.ok) {
        const base = getApiBase();
        if ((res.status === 405 || res.status === 404) && !base) {
          setFormError(
            `Error ${res.status}: el login se envió a ${window.location.origin}/api/… (Pages no sirve el API). ` +
              `En Pages → Environment variables → Production, define PUBLIC_API_URL = URL del Worker (https://…workers.dev, sin / final) y redespiega.`,
          );
        } else if (res.status === 405 && base) {
          setFormError(
            "Error 405: el servidor no acepta POST en /api/auth/login. Comprueba que PUBLIC_API_URL apunta al Worker correcto.",
          );
        } else {
          setFormError(data.error || `Error ${res.status} al iniciar sesión`);
        }
        return;
      }
      if (data.token) sessionStorage.setItem("cmp_token", data.token);
      window.location.href = "/gestion-cmp";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const origin = `${window.location.protocol}//${window.location.host}`;
      let workerOrigin = "https://TU-WORKER.workers.dev";
      try {
        workerOrigin = new URL(loginUrl).origin;
      } catch {
        /* */
      }
      setFormError(
        `Error de red / CORS (${msg}).\n\n` +
          `URL intentada: ${loginUrl}\n\n` +
          `1) En Cloudflare Pages → Environment variables → Production: PUBLIC_API_URL = ${workerOrigin} (sin / al final). Guarda y redespiega Pages.\n\n` +
          `2) En el Worker: CORS_ORIGIN debe incluir exactamente el origen de esta página:\n` +
          `   ${origin}\n` +
          `   Varios orígenes: sepáralos con coma, sin espacio tras la coma. Ejemplo:\n` +
          `   ${origin},http://localhost:4321\n\n` +
          `3) Guarda variables del Worker y vuelve a desplegar el Worker si hace falta. Luego recarga (Ctrl+F5).`,
      );
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-3 text-left text-xs leading-relaxed text-slate-400">
        <p className="font-semibold text-slate-300">Conexión al API</p>
        <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{diagUrl}</p>
        {warn ? <p className="mt-2 text-amber-400">{warn}</p> : null}
        <Button type="button" variant="outline" className="mt-3 w-full border-slate-600 text-slate-300" onClick={() => void testHealth()}>
          Probar conexión (/health)
        </Button>
        {testOut ? <p className={testOut.className + " whitespace-pre-wrap"}>{testOut.text}</p> : null}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300">Correo</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    placeholder="correo@ejemplo.com"
                    className="border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-300">Contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    className="border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {formError ? <p className="whitespace-pre-wrap text-sm text-red-400">{formError}</p> : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
