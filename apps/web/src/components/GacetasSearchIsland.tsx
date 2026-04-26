import { formatDateRange } from "little-date";
import { CalendarIcon, ChevronDown, FileDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { List2, type List2Item } from "@/components/ui/list-2";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const PER = 5;
const Q_DEBOUNCE_MS = 350;

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

function isRangePartial(r: DateRange | undefined): boolean {
  return Boolean(r?.from) && !r?.to;
}

export default function GacetasSearchIsland() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dateFromYmd, setDateFromYmd] = useState("");
  const [dateToYmd, setDateToYmd] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const rangeRef = useRef<DateRange | undefined>(undefined);
  const [items, setItems] = useState<Gazette[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isInitialRequest = useRef(true);
  const [err, setErr] = useState<string | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const qDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateFromRef = useRef("");
  const dateToRef = useRef("");

  useEffect(() => {
    dateFromRef.current = dateFromYmd;
    dateToRef.current = dateToYmd;
  }, [dateFromYmd, dateToYmd]);

  const load = useCallback(async (search: string, p: number, dFrom: string, dTo: string) => {
    if (isInitialRequest.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
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
      if (isInitialRequest.current) {
        isInitialRequest.current = false;
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

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
    dateFromRef.current = initFrom;
    dateToRef.current = initTo;
    if (initFrom || initTo) {
      const r = {
        from: initFrom ? parseYmd(initFrom) : undefined,
        to: initTo ? parseYmd(initTo) : undefined,
      };
      setRange(r);
      rangeRef.current = r;
    } else {
      setRange(undefined);
      rangeRef.current = undefined;
    }
    void load(initQ, initP, initFrom, initTo);
  }, [load]);

  useEffect(
    () => () => {
      if (qDebounce.current) clearTimeout(qDebounce.current);
    },
    [],
  );

  const runTextSearch = useCallback(
    (search: string) => {
      const dF = dateFromRef.current;
      const dT = dateToRef.current;
      setQ(search);
      setPage(1);
      syncUrl(search, 1, dF, dT);
      void load(search, 1, dF, dT);
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
    syncUrl(qInput, next, dateFromYmd, dateToYmd);
    void load(qInput, next, dateFromYmd, dateToYmd);
  };

  const applyRange = (r: DateRange | undefined) => {
    setRange(r);
    rangeRef.current = r;
    const from = toYmd(r?.from);
    const to = toYmd(r?.to);
    setDateFromYmd(from);
    setDateToYmd(to);
    dateFromRef.current = from;
    dateToRef.current = to;
    if (from && to) {
      setPage(1);
      setQ(qInput);
      syncUrl(qInput, 1, from, to);
      void load(qInput, 1, from, to);
    }
  };

  const clearDateFilter = () => {
    setRange(undefined);
    rangeRef.current = undefined;
    setDateFromYmd("");
    setDateToYmd("");
    dateFromRef.current = "";
    dateToRef.current = "";
    setPage(1);
    setDatePopoverOpen(false);
    syncUrl(qInput, 1, "", "");
    void load(qInput, 1, "", "");
  };

  const shouldBlockPopoverClose = () => isRangePartial(rangeRef.current);

  const onDateOpenChange = (o: boolean) => {
    if (o) {
      setDatePopoverOpen(true);
      return;
    }
    if (shouldBlockPopoverClose()) {
      return;
    }
    setDatePopoverOpen(false);
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
      <form onSubmit={onSearchSubmit} className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-sm font-medium text-foreground" id="gac-search-hint">
              Buscar por título, número o nombre de archivo
            </p>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="cmp-gac-search"
                value={qInput}
                onChange={(e) => onQChange(e.target.value)}
                placeholder="Ej. 2025, GO-, ordenanza…"
                className="h-10 w-full pl-9"
                autoComplete="off"
                aria-describedby="gac-search-hint"
              />
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-auto">
            <p className="mb-1.5 text-sm font-medium text-foreground">Fecha de publicación</p>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
              <Popover open={datePopoverOpen} onOpenChange={onDateOpenChange} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    id="gac-dates"
                    variant="outline"
                    className={cn(
                      "h-10 w-full min-w-[12rem] justify-between font-normal lg:min-w-[16rem] xl:min-w-[18rem]",
                    )}
                    aria-label="Elegir rango de fechas de publicación"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <CalendarIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate text-left">{rangeButtonLabel}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                  onPointerDownOutside={(e) => {
                    if (shouldBlockPopoverClose()) e.preventDefault();
                  }}
                  onFocusOutside={(e) => {
                    if (shouldBlockPopoverClose()) e.preventDefault();
                  }}
                  onInteractOutside={(e) => {
                    if (shouldBlockPopoverClose()) e.preventDefault();
                  }}
                  onEscapeKeyDown={(e) => {
                    if (shouldBlockPopoverClose()) e.preventDefault();
                  }}
                >
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
            </div>
          </div>
        </div>
      </form>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
      {initialLoading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Cargando…
        </p>
      ) : (
        <>
          <div
            className={cn("relative transition-opacity duration-200", refreshing && "pointer-events-none opacity-60")}
            aria-busy={refreshing}
          >
            <List2
              items={listItems}
              actionLabel="Descargar PDF"
              sectionClassName="py-0"
              emptyMessage="No se encontraron gacetas. Ajuste la búsqueda, las fechas o el número de edición."
            />
          </div>
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
