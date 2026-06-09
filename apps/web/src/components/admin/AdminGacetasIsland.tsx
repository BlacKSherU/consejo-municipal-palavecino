import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFilePdfField } from "@/components/admin/AdminFilePdfField";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { AdminListHeader, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiFetch, apiUrl } from "@/lib/api";
import { issueNumberFromString, pdfFileSchema } from "@/lib/validators-ve";

type Gazette = { id: number; title: string; issue_number: string; published_at: string };

function formatDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.trim();
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(iso);
  }
}

const metaSchema = z.object({
  title: z.string().min(1, "Indique un título"),
  issue_number: z.string().optional(),
  published_at: z.string().optional(),
});

type MetaValues = z.infer<typeof metaSchema>;

export function AdminGacetasIsland() {
  const [items, setItems] = useState<Gazette[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [issueError, setIssueError] = useState<string | undefined>();
  const [query, setQuery] = useState<string>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : "",
  );
  const [page, setPage] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const p = Number(new URLSearchParams(window.location.search).get("page") ?? "1");
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const PER_PAGE = 10;
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (query) params.set("q", query);
    else params.delete("q");
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [query, page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((g) =>
      [g.title, g.issue_number, g.published_at].some((v) => v?.toLowerCase().includes(q)),
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

  const form = useForm<MetaValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: { title: "", issue_number: "", published_at: "" },
  });

  async function load() {
    setListError(null);
    try {
      const res = await apiFetch("/api/admin/gazettes");
      const data = (await res.json()) as { items?: Gazette[] };
      setItems(data.items || []);
    } catch {
      setListError("Error al cargar gacetas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(values: MetaValues) {
    setFileError(undefined);
    setIssueError(undefined);
    if (!fileState) {
      setFileError("Seleccione un PDF válido (máx. 20 MB).");
      return;
    }
    const pdfResult = pdfFileSchema.safeParse(fileState);
    if (!pdfResult.success) {
      setFileError(pdfResult.error.issues[0]?.message ?? "PDF no válido");
      return;
    }
    const issue = issueNumberFromString.safeParse(values.issue_number ?? "");
    if (!issue.success) {
      setIssueError(issue.error.issues[0]?.message ?? "Número no válido");
      return;
    }

    const fd = new FormData();
    fd.set("title", values.title.trim());
    if (values.issue_number?.trim()) fd.set("issue_number", values.issue_number.trim());
    if (values.published_at) fd.set("published_at", values.published_at);
    fd.set("file", fileState);
    const res = await apiFetch("/api/admin/gazettes", { method: "POST", body: fd });
    if (res.ok) {
      form.reset({ title: "", issue_number: "", published_at: "" });
      setFileState(null);
      void load();
    } else {
      setListError("Error al subir el archivo.");
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <AdminPageHeader
        title="Gacetas oficiales"
        description="Publique las gacetas en PDF. Los archivos se sirven desde R2 con descarga directa."
        actions={
          <a
            className="text-sm font-medium text-primary hover:underline"
            href="/gacetas"
            target="_blank"
            rel="noopener noreferrer"
          >
            Página pública ↗
          </a>
        }
      />

      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            <AdminFormSection
              title="Subir documento (PDF)"
              description="Solo archivos en formato PDF. Tamaño máximo 20 MB. Los metadatos ayudan a catalogar en el listado público."
            >
              <div className="grid max-w-2xl gap-4 sm:grid-cols-1">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Gaceta municipal Nº 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="issue_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número / edición</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="Ej. 12"
                            className={issueError ? "border-destructive" : undefined}
                            {...field}
                            onChange={(e) => {
                              setIssueError(undefined);
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        {issueError ? <p className="text-sm font-medium text-destructive">{issueError}</p> : <FormMessage />}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="published_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de publicación</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <AdminFilePdfField
                  label="Archivo PDF"
                  value={fileState}
                  onChange={(f) => {
                    setFileState(f);
                    setFileError(undefined);
                  }}
                  error={fileError}
                  required
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Subiendo…" : "Subir gaceta"}
                  </Button>
                </div>
              </div>
            </AdminFormSection>
          </form>
        </Form>
        <Separator className="my-2" />
      </div>

      <div className="space-y-4">
        <AdminListHeader
          title="Publicadas"
          count={filtered.length}
          description={`Página ${safePage} de ${totalPages}${query ? ` · filtrando «${query}»` : ""}`}
        >
          <label className="sr-only" htmlFor="gazettes-admin-q">
            Buscar
          </label>
          <Input
            id="gazettes-admin-q"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar título, número o fecha…"
            className="h-9 w-64"
          />
        </AdminListHeader>
        {listError ? <ErrorBanner message={listError} onRetry={() => void load()} /> : null}
        <ConfirmDialog />
        <ul className="space-y-3">
          {paged.map((g) => (
            <li key={g.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-foreground">{g.title || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.issue_number || "—"} · {formatDate(g.published_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={apiUrl("/api/gazettes/" + g.id + "/download")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver PDF
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      type="button"
                      aria-label={`Eliminar gaceta: ${g.title}`}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "¿Eliminar esta gaceta?",
                          description: `«${g.title}» y su PDF se eliminarán de forma permanente.`,
                          confirmLabel: "Eliminar",
                          destructive: true,
                        });
                        if (!ok) return;
                        await apiFetch("/api/admin/gazettes/" + g.id, { method: "DELETE" });
                        void load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        {items.length === 0 && !listError ? <p className="mt-4 text-sm text-muted-foreground">No hay gacetas aún.</p> : null}
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
