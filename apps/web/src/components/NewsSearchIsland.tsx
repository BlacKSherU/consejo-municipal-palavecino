import { FileText, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List2, type List2Item } from "@/components/ui/list-2";
import { apiUrl } from "@/lib/api";

const PER = 5;

type ApiNews = {
  slug: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  image_url?: string | null;
};

function formatD(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
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

export default function NewsSearchIsland() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ApiNews[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (search: string, p: number) => {
      setLoading(true);
      setErr(null);
      try {
        const u = new URLSearchParams();
        u.set("page", String(p));
        u.set("perPage", String(PER));
        if (search.trim()) u.set("q", search.trim());
        const res = await fetch(apiUrl(`/api/news?${u.toString()}`));
        const data = (await res.json()) as { items?: ApiNews[]; total?: number; totalPages?: number; page?: number };
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        const tpg =
          typeof (data as { totalPages?: number }).totalPages === "number"
            ? (data as { totalPages: number }).totalPages
            : Math.max(1, Math.ceil((data.total ?? 0) / PER));
        setTotalPages(tpg);
        if (typeof (data as { page?: number }).page === "number") setPage((data as { page: number }).page);
      } catch {
        setErr("No se pudo cargar el listado.");
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
    const nextQ = qInput;
    setQ(nextQ);
    setPage(1);
    syncUrl(nextQ, 1);
    void load(nextQ, 1);
  };

  const goPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    syncUrl(q, next);
    void load(q, next);
  };

  const listItems: List2Item[] = items.map((n) => {
    const src = n.image_url?.trim();
    return {
      icon: src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <FileText className="h-6 w-6" />
      ),
      title: n.title,
      category: formatD(n.published_at),
      description: (n.excerpt || "").trim() || "—",
      link: `/noticias/detalle?slug=${encodeURIComponent(n.slug)}`,
    };
  });

  return (
    <div>
      <form onSubmit={onSearch} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="cmp-news-search" className="text-sm font-medium text-foreground">
            Buscar en título, resumen, fecha o enlace
          </label>
          <Input
            id="cmp-news-search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Palabras o parte de la fecha (ej. 2026)…"
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
            actionLabel="Leer noticia"
            sectionClassName="py-0"
            emptyMessage="No se encontraron noticias. Pruebe otras palabras o revise la fecha."
          />
          {total > 0 && totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                Anterior
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                Página {page} de {totalPages} · hasta {PER} por página
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
          )}
        </>
      )}
    </div>
  );
}
