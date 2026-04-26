import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { MarkdownDemoButton } from "@/components/admin/MarkdownDemoButton";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch, apiUrl } from "@/lib/api";
import {
  clearMarkdownResult,
  getMarkdownResult,
  goToMarkdownEditor,
  MD_FIELD,
} from "@/lib/markdown-editor-bridge";
import { MARKDOWN_DEMO_BRIEF, MARKDOWN_DEMO_RICH } from "@/lib/markdown-demo-example";

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
      const md = getMarkdownResult();
      if (md) {
        if (md.fieldId === MD_FIELD.ABOUT_MISSION) form.setValue("mission", md.value);
        else if (md.fieldId === MD_FIELD.ABOUT_VISION) form.setValue("vision", md.value);
        else if (md.fieldId === MD_FIELD.ABOUT_BODY) form.setValue("body", md.value);
        clearMarkdownResult();
      }
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>Misión (Markdown)</FormLabel>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MarkdownDemoButton onFill={() => form.setValue("mission", MARKDOWN_DEMO_BRIEF)} />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          goToMarkdownEditor({
                            returnUrl: "/gestion-cmp/quienes-somos",
                            fieldId: MD_FIELD.ABOUT_MISSION,
                            value: form.getValues("mission") || "",
                            label: "Quiénes somos — misión (Markdown)",
                          })
                        }
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Editar a pantalla completa
                      </Button>
                    </div>
                  </div>
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel>Visión (Markdown)</FormLabel>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MarkdownDemoButton onFill={() => form.setValue("vision", MARKDOWN_DEMO_BRIEF)} />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          goToMarkdownEditor({
                            returnUrl: "/gestion-cmp/quienes-somos",
                            fieldId: MD_FIELD.ABOUT_VISION,
                            value: form.getValues("vision") || "",
                            label: "Quiénes somos — visión (Markdown)",
                          })
                        }
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Editar a pantalla completa
                      </Button>
                    </div>
                  </div>
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
            <div className="max-w-3xl">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel className="text-foreground">Cuerpo (Markdown)</FormLabel>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MarkdownDemoButton onFill={() => form.setValue("body", MARKDOWN_DEMO_RICH)} />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            goToMarkdownEditor({
                              returnUrl: "/gestion-cmp/quienes-somos",
                              fieldId: MD_FIELD.ABOUT_BODY,
                              value: form.getValues("body") || "",
                              label: "Quiénes somos — cuerpo (Markdown)",
                            })
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Editar a pantalla completa
                        </Button>
                      </div>
                    </div>
                    <FormControl>
                      <Textarea rows={14} className="font-mono text-sm" placeholder="Cuerpo en Markdown…" {...field} />
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
            Guardar todo
          </Button>
        </form>
      </Form>
    </div>
  );
}
