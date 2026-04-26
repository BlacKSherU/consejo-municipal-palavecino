import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { MarkdownDemoButton } from "@/components/admin/MarkdownDemoButton";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { clearMarkdownResult, getMarkdownResult, goToMarkdownEditor, MD_FIELD } from "@/lib/markdown-editor-bridge";
import { MARKDOWN_DEMO_RICH } from "@/lib/markdown-demo-example";

const aboutSchema = z.object({
  kicker: z.string().max(500).optional(),
  hero: z.string().max(2000).optional(),
  mission: z.string().max(12_000).optional(),
  vision: z.string().max(12_000).optional(),
  body: z.string().optional(),
});

type AboutForm = z.infer<typeof aboutSchema>;

export function AdminQuienesSomosIsland() {
  const [message, setMessage] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const form = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    defaultValues: {
      kicker: "",
      hero: "",
      mission: "",
      vision: "",
      body: "",
    },
  });

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
      };
      form.reset({
        kicker: data.kicker || "",
        hero: data.hero || "",
        mission: data.mission || "",
        vision: data.vision || "",
        body: data.body || "",
      });
      const md = getMarkdownResult();
      if (md) {
        if (md.fieldId === MD_FIELD.ABOUT_BODY) form.setValue("body", md.value);
        clearMarkdownResult();
      }
    })();
  }, [form]);

  async function onSubmit(values: AboutForm) {
    setMessage(null);
    const res = await apiFetch("/api/admin/site/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kicker: values.kicker || "",
        hero: values.hero || "",
        body: values.body || "",
        mission: values.mission || "",
        vision: values.vision || "",
        images: [],
      }),
    });
    if (res.ok) {
      setMessage("Guardado. La página pública consulta el API al cargar; actualice con Ctrl+F5 si aún ve texto antiguo.");
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error ? `Error: ${j.error}` : "Error al guardar.");
    }
  }

  return (
    <div className="max-w-3xl space-y-0">
      <h1 className="text-2xl font-bold text-foreground">Quiénes somos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Texto bajo el título, misión, visión (texto plano) y cuerpo largo en Markdown. Use el Markdown del cuerpo
        (descripción) para incluir imágenes si lo necesita.{" "}
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
            description="Aparece arriba en la página: línea en mayúsculas y subtítulo."
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
            description="Solo texto (sin Markdown). Párrafos, saltos de línea o viñetas como texto simple."
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
            title="Cuerpo (Markdown)"
            description="Bloque largo al pie, con título “Nuestra historia e información”. Puede insertar imágenes con la sintaxis de Markdown o enlaces a archivos en este bloque."
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
