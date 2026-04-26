import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";

const httpsOrEmpty = z
  .string()
  .trim()
  .refine((s) => s.length === 0 || s.startsWith("https://"), {
    message: "Debe empezar por https:// (o deje vacío)",
  })
  .refine((s) => s.length === 0 || z.string().url().safeParse(s).success, { message: "URL no válida" });

const aboutSchema = z.object({
  mission: z.string().optional(),
  vision: z.string().optional(),
  body: z.string().optional(),
  images: z
    .array(
      z.object({
        url: httpsOrEmpty,
        alt: z.string().optional(),
      }),
    )
    .max(12, { message: "Máximo 12 imágenes" }),
});

type AboutForm = z.infer<typeof aboutSchema>;

function normalizeImagesForApi(images: { url: string; alt: string }[]): { url: string; alt: string }[] {
  return images
    .map((r) => ({ url: r.url.trim(), alt: (r.alt || "").trim() }))
    .filter((r) => r.url.length > 0);
}

export function AdminQuienesSomosIsland() {
  const [message, setMessage] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const form = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: { mission: "", vision: "", body: "", images: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "images" });

  useEffect(() => {
    (async () => {
      setLoadErr(null);
      const res = await apiFetch("/api/admin/site/about");
      if (!res.ok) {
        setLoadErr("No se pudo cargar el contenido.");
        return;
      }
      const data = (await res.json()) as {
        body?: string;
        mission?: string;
        vision?: string;
        images?: { url: string; alt: string }[];
      };
      const raw = Array.isArray(data.images) ? data.images : [];
      const imgs = raw.length > 0 ? raw : [];
      form.reset({
        mission: data.mission || "",
        vision: data.vision || "",
        body: data.body || "",
        images: imgs.map((i) => ({ url: i.url, alt: i.alt || "" })),
      });
    })();
  }, [form]);

  async function onSubmit(values: AboutForm) {
    setMessage(null);
    const images = normalizeImagesForApi(values.images);
    if (images.length > 12) {
      setMessage("Máximo 12 imágenes con URL.");
      return;
    }
    const res = await apiFetch("/api/admin/site/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: values.body || "",
        mission: values.mission || "",
        vision: values.vision || "",
        images,
      }),
    });
    setMessage(res.ok ? "Guardado." : "Error al guardar.");
  }

  return (
    <div className="max-w-3xl space-y-0">
      <h1 className="text-2xl font-bold text-foreground">Quiénes somos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Misión, visión, galería (URLs con <code className="text-xs">https://</code>) y cuerpo en Markdown.{" "}
        <a
          className="text-primary hover:underline"
          href="/quienes-somos"
          target="_blank"
          rel="noopener noreferrer"
        >
          Página pública
        </a>
      </p>
      {loadErr ? <p className="mt-2 text-sm text-destructive">{loadErr}</p> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-10">
          <AdminFormSection
            title="Misión"
            description="Propósito y razón de ser (texto o Markdown corto en la caja, según su uso en el sitio)."
          >
            <FormField
              control={form.control}
              name="mission"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={5} placeholder="Propósito y razón de ser del consejo…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection title="Visión" description="Horizonte deseado a mediano plazo." withTopSeparator>
            <FormField
              control={form.control}
              name="vision"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={5} placeholder="Horizonte deseado a mediano plazo…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection
            title="Imágenes (galería)"
            description="Máximo 12 filas con URL. Texto alternativo accesible recomendado."
            withTopSeparator
          >
            <div className="space-y-3">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Añada filas con la URL pública (https) de cada imagen.</p>
              ) : null}
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <FormField
                      control={form.control}
                      name={`images.${index}.url`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">URL (https://…)</FormLabel>
                          <FormControl>
                            <Input type="url" inputMode="url" placeholder="https://ejemplo.com/foto.jpg" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`images.${index}.alt`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Descripción / alt</FormLabel>
                          <FormControl>
                            <Input placeholder="Breve descripción" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (fields.length < 12) append({ url: "", alt: "" });
                }}
                disabled={fields.length >= 12}
              >
                <Plus className="h-4 w-4" />
                Añadir imagen
              </Button>
            </div>
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection title="Cuerpo (Markdown)" description="Contenido extenso en Markdown para la página." withTopSeparator>
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={16} className="font-mono text-sm" placeholder="Cuerpo…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AdminFormSection>

          {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Guardar todo
          </Button>
        </form>
      </Form>
    </div>
  );
}
