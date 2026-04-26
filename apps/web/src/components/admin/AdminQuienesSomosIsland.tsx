import { zodResolver } from "@hookform/resolvers/zod";
import { marked } from "marked";
import { Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch, apiUrl } from "@/lib/api";

const imageRowSchema = z
  .object({
    key: z.string().optional(),
    url: z.string().optional(),
    alt: z.string().optional(),
  })
  .refine(
    (r) => {
      const k = (r.key ?? "").trim();
      const u = (r.url ?? "").trim();
      return (k.length > 0 && u.length === 0) || (u.length > 0 && u.startsWith("https://") && k.length === 0);
    },
    { message: "Cada imagen debe subirse desde su equipo o conservar un enlace https antiguo." },
  );

const aboutSchema = z.object({
  kicker: z.string().max(500).optional(),
  hero: z.string().max(2000).optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  body: z.string().optional(),
  images: z.array(imageRowSchema).max(12, { message: "Máximo 12 imágenes" }),
});

type AboutForm = z.infer<typeof aboutSchema>;

type ImagePayload = { key?: string; url?: string; alt: string };

function toApiImages(images: AboutForm["images"]): ImagePayload[] {
  return images
    .map((r) => {
      const k = (r.key ?? "").trim();
      const u = (r.url ?? "").trim();
      if (k) return { key: k, alt: (r.alt ?? "").trim() };
      if (u) return { url: u, alt: (r.alt ?? "").trim() };
      return null;
    })
    .filter((x): x is ImagePayload => x !== null);
}

export function AdminQuienesSomosIsland() {
  const [message, setMessage] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      kicker: "",
      hero: "",
      mission: "",
      vision: "",
      body: "",
      images: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "images" });
  const bodyForPreview = form.watch("body");
  const bodyHtml = useMemo(() => {
    const t = (bodyForPreview || "").trim();
    if (!t) return null;
    return marked.parse(t, { async: false }) as string;
  }, [bodyForPreview]);

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
        kicker?: string;
        hero?: string;
        mission?: string;
        vision?: string;
        images?: { key?: string; url?: string; alt?: string }[];
      };
      const raw = Array.isArray(data.images) ? data.images : [];
      const imgs = raw
        .map((i) => {
          if (i.key) return { key: i.key, url: "", alt: i.alt || "" };
          if (i.url) return { key: "", url: i.url, alt: i.alt || "" };
          return null;
        })
        .filter((r): r is { key: string; url: string; alt: string } => r !== null);
      form.reset({
        kicker: data.kicker || "",
        hero: data.hero || "",
        mission: data.mission || "",
        vision: data.vision || "",
        body: data.body || "",
        images: imgs,
      });
    })();
  }, [form]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if ((form.getValues("images")?.length ?? 0) >= 12) return;
    if (!f.type.startsWith("image/")) {
      setMessage("Seleccione un archivo de imagen.");
      return;
    }
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("file", f);
    const res = await apiFetch("/api/admin/site/about/gallery", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error ?? "No se pudo subir la imagen.");
      return;
    }
    const j = (await res.json()) as { key?: string };
    if (j.key) append({ key: j.key, url: "", alt: "" });
  }

  async function onSubmit(values: AboutForm) {
    setMessage(null);
    const images = toApiImages(values.images);
    if (images.length > 12) {
      setMessage("Máximo 12 imágenes.");
      return;
    }
    const res = await apiFetch("/api/admin/site/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kicker: values.kicker || "",
        hero: values.hero || "",
        body: values.body || "",
        mission: values.mission || "",
        vision: values.vision || "",
        images,
      }),
    });
    if (res.ok) {
      setMessage("Guardado. Actualice la página pública; el contenido ya no se almacena en caché del navegador.");
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error ? `Error: ${j.error}` : "Error al guardar (revise imágenes y longitudes de texto).");
    }
  }

  function previewSrcForRow(i: { key?: string; url?: string }): string {
    const k = (i.key ?? "").trim();
    const u = (i.url ?? "").trim();
    if (k) return apiUrl("/api/site/about/photo?key=" + encodeURIComponent(k));
    return u;
  }

  return (
    <div className="max-w-3xl space-y-0">
      <h1 className="text-2xl font-bold text-foreground">Quiénes somos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Cabecera, misión, visión, galería (subida desde su equipo) y cuerpo en Markdown.{" "}
        <a
          className="text-primary hover:underline"
          href="/quienes-somos"
          target="_blank"
          rel="noopener noreferrer"
        >
          Página pública
        </a>
        .
      </p>
      {loadErr ? <p className="mt-2 text-sm text-destructive">{loadErr}</p> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-10">
          <AdminFormSection
            title="Texto bajo el título"
            description="Aparece arriba en la página: línea en mayúsculas y subtítulo. Antes estaba fijo en el sitio; ahora se guarda aquí."
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="kicker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Línea pequeña (kicker)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="p. ej. Consejo Municipal de Palavecino"
                        className="max-w-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo bajo “Quiénes somos”</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Frase introductoria al bloque de misión y visión…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection
            title="Misión y visión"
            description="Acepta Markdown sencillo (párrafos, negrita, listas, enlaces)."
            withTopSeparator
          >
            <FormField
              control={form.control}
              name="mission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Misión</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Propósito y razón de ser del consejo…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-6" />
            <FormField
              control={form.control}
              name="vision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visión</FormLabel>
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
            description="Hasta 12 imágenes: súbalas desde su ordenador. Las antiguas con solo URL aún se muestran hasta que las reemplace subiendo otra y guardando."
            withTopSeparator
          >
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                ref={galleryFileInputRef}
                onChange={onPickFile}
              />
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Use “Subir imagen” para añadir la primera.</p>
              ) : null}
              {fields.map((field, index) => {
                const row = form.watch(`images.${index}`);
                const psrc = row ? previewSrcForRow(row) : "";
                return (
                  <div
                    key={field.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-start"
                  >
                    <FormField
                      control={form.control}
                      name={`images.${index}.key`}
                      render={({ field: f }) => <input type="hidden" {...f} />}
                    />
                    <FormField
                      control={form.control}
                      name={`images.${index}.url`}
                      render={({ field: f }) => <input type="hidden" {...f} />}
                    />
                    {psrc ? (
                      <div className="h-32 w-44 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        <img
                          src={psrc}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-2">
                      {row && (row.url?.trim() ?? "") !== "" && !(row.key?.trim() ?? "") ? (
                        <p className="text-xs text-amber-700 dark:text-amber-400">Enlace heredado: puede sustituirlo subiendo otra imagen (opcional).</p>
                      ) : null}
                      <FormField
                        control={form.control}
                        name={`images.${index}.alt`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Descripción (alt) — recomendada para accesibilidad</FormLabel>
                            <FormControl>
                              <Input placeholder="Qué se ve en la imagen" {...f} />
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
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (fields.length < 12) galleryFileInputRef.current?.click();
                  }}
                  disabled={fields.length >= 12 || uploading}
                >
                  {uploading ? "Subiendo…" : (
                    <>
                      <Upload className="h-4 w-4" />
                      Subir imagen
                    </>
                  )}
                </Button>
                {fields.length < 12 ? null : <span className="self-center text-xs text-muted-foreground">Máximo 12</span>}
              </div>
            </div>
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection
            title="Cuerpo (Markdown)"
            description="Bloque largo al pie, con título “Nuestra historia e información”."
            withTopSeparator
          >
            <details className="rounded-lg border border-border bg-muted/40 p-4 text-sm open:bg-muted/60">
              <summary className="cursor-pointer font-medium text-foreground">Guía rápida de Markdown (clic para abrir)</summary>
              <div className="mt-4 space-y-3 text-muted-foreground">
                <p>El texto se traduce a HTML. Use líneas en blanco para separar bloques (párrafos, listas, títulos).</p>
                <ul className="ml-4 list-outside list-disc space-y-2">
                  <li>
                    <strong className="text-foreground">Títulos</strong>: líneas con <code className="text-xs"># Título 1</code> hasta <code className="text-xs">#### Subtítulo</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Cursiva y negrita</strong>: <code className="text-xs">*cursiva*</code> o <code className="text-xs">_cursiva_</code>{" "}
                    y <code className="text-xs">**negrita**</code> o <code className="text-xs">__negrita__</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Vínculos</strong>: <code className="text-xs">[texto visible](https://…)</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Listas con viñetas</strong>: inicie líneas con <code className="text-xs">- </code>o <code className="text-xs">* </code> (cada viñeta en su línea).{" "}
                    <strong>Lista numerada</strong>: <code className="text-xs">1. </code><code className="text-xs">2. </code>…
                  </li>
                  <li>
                    <strong className="text-foreground">Cita</strong>: comience con <code className="text-xs">&gt; </code>en cada línea citada.
                  </li>
                  <li>
                    <strong className="text-foreground">Código en línea</strong>: comillas inversas simples, <code className="text-xs">`así`</code>. <strong className="text-foreground">Bloque de código</strong>
                    : tres tildes en su propia línea antes y después, con opcionalmente <code className="text-xs">```json</code> o <code className="text-xs">```python</code> al abrir.
                  </li>
                  <li>
                    <strong className="text-foreground">Tabla</strong>: separe celdas con <code className="text-xs">|</code>; bajo el encabezado use <code className="text-xs">| --- | --- |</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Línea horizontal</strong>: <code className="text-xs">---</code> o <code className="text-xs">***</code> en una sola línea.
                  </li>
                </ul>
                <p>Evite copiar y pegar HTML de Word sin revisar: si algo no se ve bien, use párrafos sencillos, listas y resaltado con * y **.</p>
              </div>
            </details>
            <div className="mt-4 grid min-h-[22rem] gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="flex min-h-0 flex-col">
                    <FormLabel className="text-foreground">Editor (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[20rem] flex-1 resize-y font-mono text-sm md:min-h-0"
                        rows={16}
                        placeholder="Cuerpo en Markdown…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-card">
                <p className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">Vista previa</p>
                <div className="max-h-[min(32rem,60vh)] min-h-[12rem] flex-1 overflow-y-auto px-3 py-3">
                  {bodyHtml ? (
                    <div
                      className="prose prose-slate max-w-none text-sm dark:prose-invert prose-headings:font-semibold prose-p:mb-3 prose-p:last:mb-0 prose-a:text-primary dark:prose-a:text-primary prose-strong:text-foreground"
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">La vista previa se actualiza mientras escribe a la izquierda.</p>
                  )}
                </div>
              </div>
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
            Guardar todo
          </Button>
        </form>
      </Form>
    </div>
  );
}
