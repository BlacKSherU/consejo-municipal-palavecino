import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiFetch, apiUrl } from "@/lib/api";
import { emailSchema } from "@/lib/validators-ve";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function AdminLoginIsland() {
  const [formError, setFormError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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

  async function onSubmit(values: LoginValues) {
    setFormError("");
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      let data: { error?: string; token?: string } = {};
      try {
        data = (await res.json()) as { error?: string; token?: string };
      } catch {
        /* respuesta sin JSON */
      }
      if (!res.ok) {
        if (res.status === 401) setFormError("Correo o contraseña incorrectos.");
        else if (res.status === 429) setFormError(data.error ?? "Demasiados intentos. Espere unos minutos.");
        else setFormError(data.error ?? "No se pudo iniciar sesión. Intente nuevamente.");
        return;
      }
      if (data.token) sessionStorage.setItem("cmp_token", data.token);
      window.location.href = "/gestion-cmp";
    } catch {
      setFormError("No se pudo conectar con el servidor. Verifique su conexión.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-200">Correo</FormLabel>
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
              <FormLabel className="text-slate-200">Contraseña</FormLabel>
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
        {formError ? (
          <p role="alert" className="text-sm text-red-400">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}
