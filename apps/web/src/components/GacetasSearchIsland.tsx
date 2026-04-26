import { formatDateRange } from "little-date";
import { CalendarIcon, ChevronDown, FileDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { List2, type List2Item } from "@/components/ui/list-2";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

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

function toYmd(d: Date | undefined | null): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function syncUrl(q: string, page: number, dateFrom: string, dateTo: string) {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (page > 1) p.set("page", String(page));
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  const qs = p.toString();
  const path = window.location.pathname;
  window.history.replaceState({}, "", qs ? `${path}?${qs}` : path);
}

export default function GacetasSearchIsland() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dateFromYmd, setDateFromYmd] = useState("");
  const [dateToYmd, setDateToYmd] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [items, setItems] = useState<Gazette[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const load = useCallback(async (search: string, p: number, dFrom: string, dTo: string) => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URLSearchParams();
      u.set("page", String(p));
      u.set("perPage", String(PER));
      if (search.trim()) u.set("q", search.trim());
      if (dFrom) u.set("dateFrom", dFrom);
      if (dTo) u.set("dateTo", dTo);
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
    const initFrom = pr.get("dateFrom") || "";
    const initTo = pr.get("dateTo") || "";
    setQInput(initQ);
    setQ(initQ);
    setPage(initP);
    setDateFromYmd(initFrom);
    setDateToYmd(initTo);
    if (initFrom || initTo) {
      setRange({
        from: initFrom ? parseYmd(initFrom) : undefined,
        to: initTo ? parseYmd(initTo) : undefined,
      });
    } else {
      setRange(undefined);
    }
    void load(initQ, initP, initFrom, initTo);
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
    syncUrl(qInput, 1, dateFromYmd, dateToYmd);
    void load(qInput, 1, dateFromYmd, dateToYmd);
  };

  const goPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    syncUrl(q, next, dateFromYmd, dateToYmd);
    void load(q, next, dateFromYmd, dateToYmd);
  };

  const applyRange = (r: DateRange | undefined) => {
    setRange(r);
    const from = toYmd(r?.from);
    const to = toYmd(r?.to);
    setDateFromYmd(from);
    setDateToYmd(to);
    if (from && to) {
      setPage(1);
      setDatePopoverOpen(false);
      syncUrl(q, 1, from, to);
      void load(q, 1, from, to);
    }
  };

  const clearDateFilter = () => {
    setRange(undefined);
    setDateFromYmd("");
    setDateToYmd("");
    setPage(1);
    syncUrl(q, 1, "", "");
    void load(q, 1, "", "");
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

  const rangeButtonLabel =
    range?.from && range?.to
      ? formatDateRange(range.from, range.to, { includeTime: false, locale: "es" })
      : "Rango de fechas";

  return (
    <div>
      <form onSubmit={onSearch} className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="cmp-gac-search" className="text-sm font-medium text-foreground">
              Buscar por título, número, nombre de archivo o texto en fecha
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
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[12rem]">
            <span className="text-sm font-medium text-foreground">Fecha de publicación</span>
            <div className="flex flex-wrap items-end gap-2">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    id="gac-dates"
                    variant="outline"
                    className={cn(
                      "h-10 w-full min-w-[12rem] justify-between font-normal sm:max-w-[20rem] lg:min-w-[14rem]",
                    )}
                    aria-label="Elegir rango de fechas de publicación"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <CalendarIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{rangeButtonLabel}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <div className="p-1">
                    <Calendar
                      mode="range"
                      selected={range}
                      onSelect={applyRange}
                      numberOfMonths={1}
                      className="rounded-md"
                    />
                  </div>
                  <div className="border-t border-border p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setDatePopoverOpen(false);
                        clearDateFilter();
                      }}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Quitar filtro de fechas
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {(dateFromYmd || dateToYmd) && (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {dateFromYmd && dateToYmd
                    ? `Filtro activo: ${dateFromYmd} al ${dateToYmd}`
                    : "Elija inicio y fin en el calendario"}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col justify-end sm:flex-row sm:items-end sm:gap-2 lg:w-auto">
            <Button type="submit" className="h-10 w-full sm:min-w-[7rem]">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Puede combinar búsqueda con rango: las gacetas deben publicarse entre las dos fechas (inclusive).
        </p>
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
            emptyMessage="No se encontraron gacetas. Ajuste la búsqueda, las fechas o el número de edición."
          />
          {total > 0 && (total > PER || totalPages > 1) && (
            <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Paginación de gacetas">
              <p className="text-sm text-muted-foreground">
                {total} edición{total === 1 ? "" : "es"} · {PER} por página
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
