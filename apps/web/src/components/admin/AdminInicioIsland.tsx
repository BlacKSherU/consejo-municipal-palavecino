import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import type { HomePageContent } from "@/scripts/load-home-page";

const hrefZ = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (h) =>
      h.startsWith("/") &&
      !h.startsWith("//") &&
      !/javascript:/i.test(h) &&
      !/data:/i.test(h) &&
      !h.includes(" "),
    { message: "Use una ruta interna (empieza con /), sin espacios." },
  );

const homeSchema = z.object({
  hero_badge: z.string().max(300),
  hero_title_1: z.string().max(300),
  hero_title_2: z.string().max(300),
  hero_lead: z.string().max(3000),
  btn_noticias: z.string().max(120),
  btn_gacetas: z.string().max(120),
  btn_noticias_href: hrefZ,
  btn_gacetas_href: hrefZ,
  hero_card_text: z.string().max(800),
  mission_h2: z.string().max(300),
  mission_text: z.string().max(3000),
  ig_h2: z.string().max(200),
  ig_lead: z.string().max(1000),
});

type HomeForm = z.infer<typeof homeSchema>;

const empty: HomeForm = {
  hero_badge: "",
  hero_title_1: "",
  hero_title_2: "",
  hero_lead: "",
  btn_noticias: "",
  btn_gacetas: "",
  btn_noticias_href: "/",
  btn_gacetas_href: "/",
  hero_card_text: "",
  mission_h2: "",
  mission_text: "",
  ig_h2: "",
  ig_lead: "",
};

export function AdminInicioIsland() {
  const [message, setMessage] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const form = useForm<HomeForm>({
    resolver: zodResolver(homeSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    (async () => {
      setLoadErr(null);
      const res = await apiFetch("/api/admin/site/home");
      if (!res.ok) {
        setLoadErr("No se pudo cargar el contenido de la portada.");
        return;
      }
      const d = (await res.json()) as HomePageContent;
      form.reset(d);
    })();
  }, [form]);

  async function onSubmit(values: HomeForm) {
    setMessage(null);
    const res = await apiFetch("/api/admin/site/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setMessage("Guardado. Al abrir o actualizar el inicio público verá los textos (sin caché en el API).");
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error ? `Error: ${j.error}` : "Error al guardar.");
    }
  }

  return (
    <div className="max-w-3xl space-y-0">
      <h1 className="text-2xl font-bold text-foreground">Página de inicio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Textos del héroe, bloque de misión e introducción a Instagram.{" "}
        <a className="text-primary hover:underline" href="/" target="_blank" rel="noopener noreferrer">
          Ver sitio público
        </a>
        .
      </p>
      {loadErr ? <p className="mt-2 text-sm text-destructive">{loadErr}</p> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-10">
          <AdminFormSection
            title="Encabezado (héroe)"
            description="Línea con insignia, título en dos partes, párrafo y botones. Los enlaces deben ser rutas del propio sitio (empiezan con /)."
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hero_badge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insignia (kicker)</FormLabel>
                    <FormControl>
                      <Input className="max-w-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hero_title_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título (línea 1, con estilo de gradiente en el sitio)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hero_title_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título (línea 2)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="hero_lead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto introductorio</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="btn_noticias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto del botón principal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="btn_noticias_href"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace del botón principal</FormLabel>
                      <FormControl>
                        <Input placeholder="/noticias" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="btn_gacetas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto del botón secundario</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="btn_gacetas_href"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace del botón secundario</FormLabel>
                      <FormControl>
                        <Input placeholder="/gacetas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="hero_card_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto bajo el logotipo en la tarjeta</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection title="Bloque «Misión»" withTopSeparator>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="mission_h2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del bloque (h2)</FormLabel>
                    <FormControl>
                      <Input className="max-w-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mission_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto (plano, sin Markdown)</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection title="Sección Instagram" withTopSeparator>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="ig_h2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título (h2)</FormLabel>
                    <FormControl>
                      <Input className="max-w-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ig_lead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo bajo el título</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </AdminFormSection>

          {message ? (
            <p
              className={
                message.startsWith("Guardado")
                  ? "text-sm text-emerald-600 dark:text-emerald-400"
                  : "text-sm text-amber-800 dark:text-amber-200"
              }
            >
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Guardar
          </Button>
        </form>
      </Form>
    </div>
  );
}
