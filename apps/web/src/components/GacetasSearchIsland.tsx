import { FileDown, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List2, type List2Item } from "@/components/ui/list-2";
import { apiUrl } from "@/lib/api";

const PER = 5;

type Gazette = {
  id: number;
  title: string;
  issue_number: string;
  published_at: string;
  file_name: string;
};

function formatD(iso: string | null | undefined): string {
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

function syncUrl(q: string, page: number) {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  const path = window.location.pathname;
  const next = s ? `${path}?${s}` : path;
  window.history.replaceState({}, "", next);
}

export default function GacetasSearchIsland() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Gazette[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (search: string, p: number) => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URLSearchParams();
      u.set("page", String(p));
      u.set("perPage", String(PER));
      if (search.trim()) u.set("q", search.trim());
      const res = await fetch(apiUrl(`/api/gazettes?${u.toString()}`), { cache: "no-store" });
      const data = (await res.json()) as {
        items?: Gazette[];
        total?: number;
        totalPages?: number;
        page?: number;
      };
      setItems(data.items ?? []);
      const t = data.total;
      const rawTotal = typeof t === "number" && Number.isFinite(t) ? t : 0;
      setTotal(rawTotal);
      setTotalPages(
        typeof data.totalPages === "number" && Number.isFinite(data.totalPages)
          ? data.totalPages
          : Math.max(1, Math.ceil(rawTotal / PER)),
      );
      if (typeof data.page === "number") setPage(data.page);
    } catch {
      setErr("No se pudo cargar el listado.");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const pr = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const initQ = pr.get("q") || "";
    const initP = Math.max(1, parseInt(pr.get("page") || "1", 10) || 1);
    setQInput(initQ);
    setQ(initQ);
    setPage(initP);
    void load(initQ, initP);
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
    syncUrl(qInput, 1);
    void load(qInput, 1);
  };

  const goPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    syncUrl(q, next);
    void load(q, next);
  };

  const listItems: List2Item[] = items.map((g) => {
    const href = apiUrl("/api/gazettes/" + g.id + "/download");
    return {
      icon: <FileDown className="h-6 w-6" />,
      title: g.title || "—",
      category: `N.º ${g.issue_number || "—"} · ${formatD(g.published_at)}`,
      description: g.file_name || "Documento PDF",
      link: href,
      linkTarget: "_blank",
      linkRel: "noopener noreferrer",
    };
  });

  return (
    <div>
      <form onSubmit={onSearch} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="cmp-gac-search" className="text-sm font-medium text-foreground">
            Buscar por título, número, nombre de archivo o fecha
          </label>
          <Input
            id="cmp-gac-search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Ej. 2025, GO-, ordenanza…"
            className="w-full"
            autoComplete="off"
          />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </form>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Cargando…
        </p>
      ) : (
        <>
          <List2
            items={listItems}
            actionLabel="Descargar PDF"
            sectionClassName="py-0"
            emptyMessage="No se encontraron gacetas. Ajuste la búsqueda o el número de edición."
          />
          {total > 0 && (total > PER || totalPages > 1) && (
            <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Paginación de gacetas">
              <p className="text-sm text-muted-foreground">
                {total} edición{total === 1 ? "" : "es"} · hasta {PER} por página
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  Anterior
                </Button>
                <span className="px-1 text-sm tabular-nums text-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
              {totalPages > 1 && totalPages <= 12 && (
                <div className="flex max-w-full flex-wrap justify-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={n === page ? "default" : "outline"}
                      className="min-w-9"
                      onClick={() => goPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
