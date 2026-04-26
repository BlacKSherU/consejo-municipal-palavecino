import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { MarkdownDemoButton } from "@/components/admin/MarkdownDemoButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import {
  clearMarkdownResult,
  getMarkdownResult,
  goToMarkdownEditor,
  MD_FIELD,
} from "@/lib/markdown-editor-bridge";
import { MARKDOWN_DEMO_RICH } from "@/lib/markdown-demo-example";

const createSchema = z.object({
  title: z.string().min(1, "Indique un título"),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  published: z.boolean(),
});

const editSchema = z.object({
  title: z.string().min(1, "Indique un título"),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  published: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

type NewsItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published: boolean;
  published_at: string | null;
};

export function AdminNoticiasIsland() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const skipNextEditLoadFromList = useRef(false);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", slug: "", excerpt: "", body: "", published: true },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: "", slug: "", excerpt: "", body: "", published: false },
  });

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await apiFetch("/api/admin/news");
      const data = (await res.json()) as { items?: NewsItem[] };
      setItems(data.items || []);
    } catch {
      setLoadErr("Error al cargar noticias.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const r = getMarkdownResult();
    if (!r) return;
    if (r.fieldId === MD_FIELD.NOTICIAS_CREATE_BODY) {
      createForm.setValue("body", r.value);
      clearMarkdownResult();
      return;
    }
    const m = r.fieldId.match(/^noticias-edit-body-(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      const n = items.find((i) => i.id === id);
      if (!n) return;
      skipNextEditLoadFromList.current = true;
      setEditingId(id);
      editForm.reset({
        title: n.title,
        slug: n.slug,
        excerpt: n.excerpt || "",
        body: r.value,
        published: n.published,
      });
      clearMarkdownResult();
    }
  }, [items, createForm, editForm]);

  useEffect(() => {
    if (editingId == null) return;
    if (skipNextEditLoadFromList.current) {
      skipNextEditLoadFromList.current = false;
      return;
    }
    const n = items.find((i) => i.id === editingId);
    if (n) {
      editForm.reset({
        title: n.title,
        slug: n.slug,
        excerpt: n.excerpt || "",
        body: n.body || "",
        published: n.published,
      });
    }
  }, [editingId, items, editForm]);

  async function onCreate(values: CreateForm) {
    const res = await apiFetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        slug: values.slug?.trim() || undefined,
        excerpt: values.excerpt,
        body: values.body,
        published: values.published,
      }),
    });
    if (res.ok) {
      createForm.reset({ title: "", slug: "", excerpt: "", body: "", published: true });
      void load();
    }
  }

  async function onEditSave(id: number, publishedAt: string | null) {
    const values = editForm.getValues();
    const res = await apiFetch("/api/admin/news/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        body: values.body,
        published: values.published,
        published_at: publishedAt,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      void load();
    }
  }

  return (
    <div className="max-w-4xl space-y-10">
      <h1 className="text-2xl font-bold text-foreground">Noticias</h1>
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}

      <Form {...createForm}>
        <form onSubmit={createForm.handleSubmit(onCreate)}>
          <AdminFormSection
            title="Nueva noticia"
            description="Cuerpo en Markdown. Puede dejar en borrador desmarcando &quot;Publicada&quot;."
          >
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Slug (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="se-genera-si-vacío" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Resumen</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel>Cuerpo (Markdown)</FormLabel>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MarkdownDemoButton onFill={() => createForm.setValue("body", MARKDOWN_DEMO_RICH)} />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            goToMarkdownEditor({
                              returnUrl: "/gestion-cmp/noticias",
                              fieldId: MD_FIELD.NOTICIAS_CREATE_BODY,
                              value: createForm.getValues("body") || "",
                              label: "Nueva noticia — cuerpo (Markdown)",
                            })
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Editar a pantalla completa
                        </Button>
                      </div>
                    </div>
                    <FormControl>
                      <Textarea rows={8} className="font-mono text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">Publicada</FormLabel>
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  Crear
                </Button>
              </div>
            </div>
          </AdminFormSection>
        </form>
      </Form>

      <Separator className="my-2" />

      <div>
        <h2 className="text-lg font-semibold">Listado</h2>
        <ul className="mt-4 space-y-4">
          {items.map((n) => (
            <li key={n.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {n.slug} · {n.published ? "publicada" : "borrador"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId((id) => (id === n.id ? null : n.id))}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={async () => {
                          if (!confirm("¿Eliminar esta noticia?")) return;
                          await apiFetch("/api/admin/news/" + n.id, { method: "DELETE" });
                          void load();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  {editingId === n.id ? (
                    <Form {...editForm}>
                      <form
                        className="mt-4 space-y-3 border-t border-border pt-4"
                        onSubmit={editForm.handleSubmit(() => onEditSave(n.id, n.published_at))}
                      >
                        <FormField
                          control={editForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="excerpt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resumen</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="body"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <FormLabel>Cuerpo (Markdown)</FormLabel>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <MarkdownDemoButton onFill={() => editForm.setValue("body", MARKDOWN_DEMO_RICH)} />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      goToMarkdownEditor({
                                        returnUrl: "/gestion-cmp/noticias",
                                        fieldId: MD_FIELD.noticiasEditBody(n.id),
                                        value: editForm.getValues("body") || "",
                                        label: `${n.title} — cuerpo (Markdown)`,
                                      })
                                    }
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Editar a pantalla completa
                                  </Button>
                                </div>
                              </div>
                              <FormControl>
                                <Textarea rows={6} className="font-mono text-xs" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="published"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded"
                                  checked={field.value}
                                  onChange={(e) => field.onChange(e.target.checked)}
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">Publicada</FormLabel>
                            </FormItem>
                          )}
                        />
                        <Button type="submit">Guardar</Button>
                      </form>
                    </Form>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        {items.length === 0 && !loadErr ? (
          <p className="mt-4 text-sm text-muted-foreground">No hay noticias.</p>
        ) : null}
      </div>
    </div>
  );
}
