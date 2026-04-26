import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFilePdfField } from "@/components/admin/AdminFilePdfField";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-10">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-foreground">Gacetas oficiales</h1>
      </div>

      <div className="max-w-4xl space-y-6">
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

      <div className="max-w-4xl">
        <h2 className="text-lg font-semibold">Publicadas</h2>
        {listError ? <p className="mt-2 text-sm text-destructive">{listError}</p> : null}
        <ul className="mt-4 space-y-3">
          {items.map((g) => (
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
                      onClick={async () => {
                        if (!confirm("¿Eliminar esta gaceta?")) return;
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
      </div>
    </div>
  );
}
