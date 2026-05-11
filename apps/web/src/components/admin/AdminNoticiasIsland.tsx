import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { MarkdownDemoButton } from "@/components/admin/MarkdownDemoButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { safeFetchJson } from "@/lib/safe-fetch";
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
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "",
  );
  const [page, setPage] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const p = Number(new URLSearchParams(window.location.search).get("page") ?? "1");
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const PER_PAGE = 10;
  const skipNextEditLoadFromList = useRef(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Sync URL state (q, page)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (query) params.set("q", query);
    else params.delete("q");
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const q = params.toString();
    const next = window.location.pathname + (q ? `?${q}` : "");
    window.history.replaceState({}, "", next);
  }, [query, page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) =>
      [n.title, n.slug, n.excerpt].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filtered, safePage],
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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
    setLoading(true);
    try {
      const data = await safeFetchJson<{ items?: NewsItem[] }>("/api/admin/news", { retries: 1 });
      setItems(data.items || []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Error al cargar noticias.");
    } finally {
      setLoading(false);
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
      <ConfirmDialog />
      {loadErr ? <ErrorBanner message={loadErr} onRetry={() => void load()} /> : null}
      {loading && !loadErr ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">Cargando noticias…</p>
      ) : null}

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
                      <Checkbox
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Listado</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="news-admin-q">
              Buscar
            </label>
            <Input
              id="news-admin-q"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Título, slug o resumen"
              className="h-8 w-64"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
          {query ? ` para «${query}»` : ""} · página {safePage} de {totalPages}
        </p>
        <ul className="mt-4 space-y-4">
          {paged.map((n) => (
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
                        aria-label={`Editar noticia: ${n.title}`}
                        aria-expanded={editingId === n.id}
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
                        aria-label={`Eliminar noticia: ${n.title}`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: "¿Eliminar esta noticia?",
                            description: `«${n.title}» se eliminará de forma permanente.`,
                            confirmLabel: "Eliminar",
                            destructive: true,
                          });
                          if (!ok) return;
                          try {
                            await safeFetchJson(`/api/admin/news/${n.id}`, { method: "DELETE" });
                            void load();
                          } catch (e) {
                            setLoadErr(e instanceof Error ? e.message : "No se pudo eliminar.");
                          }
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
                                <Checkbox
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
        {filtered.length === 0 && items.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ningún resultado para «{query}».{" "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              Limpiar
            </button>
          </p>
        ) : null}
        {totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Paginación">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              ← Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              Siguiente →
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
