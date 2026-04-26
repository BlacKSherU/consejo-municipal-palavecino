import { FileText, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List2, type List2Item } from "@/components/ui/list-2";
import { apiUrl } from "@/lib/api";

const PER = 5;
const Q_DEBOUNCE_MS = 350;

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
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ApiNews[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const qDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (search: string, p: number) => {
      setLoading(true);
      setErr(null);
      try {
        const u = new URLSearchParams();
        u.set("page", String(p));
        u.set("perPage", String(PER));
        if (search.trim()) u.set("q", search.trim());
        const res = await fetch(apiUrl(`/api/news?${u.toString()}`), { cache: "no-store" });
        const data = (await res.json()) as { items?: ApiNews[]; total?: number; totalPages?: number; page?: number };
        setItems(data.items ?? []);
        const t = data.total;
        setTotal(typeof t === "number" && Number.isFinite(t) ? t : 0);
        const rawTotal = typeof t === "number" && Number.isFinite(t) ? t : 0;
        const tpg =
          typeof (data as { totalPages?: number }).totalPages === "number" &&
          Number.isFinite((data as { totalPages: number }).totalPages)
            ? (data as { totalPages: number }).totalPages
            : Math.max(1, Math.ceil(rawTotal / PER));
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
    setPage(initP);
    void load(initQ, initP);
  }, [load]);

  useEffect(
    () => () => {
      if (qDebounce.current) clearTimeout(qDebounce.current);
    },
    [],
  );

  const runTextSearch = useCallback(
    (search: string) => {
      setPage(1);
      syncUrl(search, 1);
      void load(search, 1);
    },
    [load],
  );

  const scheduleTextSearch = useCallback(
    (value: string) => {
      if (qDebounce.current) clearTimeout(qDebounce.current);
      qDebounce.current = setTimeout(() => {
        runTextSearch(value);
        qDebounce.current = null;
      }, Q_DEBOUNCE_MS);
    },
    [runTextSearch],
  );

  const onQChange = (value: string) => {
    setQInput(value);
    scheduleTextSearch(value);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qDebounce.current) {
      clearTimeout(qDebounce.current);
      qDebounce.current = null;
    }
    runTextSearch(qInput);
  };

  const goPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    syncUrl(qInput, next);
    void load(qInput, next);
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
      <form onSubmit={onSearchSubmit} className="mb-8">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-sm font-medium text-foreground" id="cmp-news-hint">
            Buscar por título, resumen o fecha
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="cmp-news-search"
              value={qInput}
              onChange={(e) => onQChange(e.target.value)}
              placeholder="Palabras o parte de la fecha (ej. 2026)…"
              className="h-10 w-full pl-9"
              autoComplete="off"
              aria-describedby="cmp-news-hint"
            />
          </div>
        </div>
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
            emptyMessage="No se encontraron noticias. Pruebe otras palabras o revise la fecha en el texto de búsqueda."
          />
          {total > 0 && (total > PER || totalPages > 1) && (
            <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Paginación de resultados">
              <p className="text-sm text-muted-foreground">
                {total} resultado{total === 1 ? "" : "s"} · hasta {PER} por página
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
