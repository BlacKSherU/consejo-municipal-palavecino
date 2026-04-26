import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

type Gazette = {
  id: number;
  title: string;
  issue_number: string;
  published_at: string;
  file_name: string;
  file_size: number;
  mime: string;
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

export default function GacetasHomeIsland() {
  const [rows, setRows] = useState<Gazette[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/gazettes?limit=10&offset=0"), { cache: "no-store" });
        const data = (await res.json()) as { items?: Gazette[]; total?: number };
        if (!c) {
          setRows((data.items ?? []).slice(0, 10));
        }
      } catch {
        if (!c) setErr("Error al cargar gacetas.");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <th scope="col" className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                Título
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                Número
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                Fecha
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                Descarga
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" aria-live="polite">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  No hay gacetas publicadas.
                </td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                >
                  <td className="max-w-[min(28rem,40vw)] px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                    <span className="line-clamp-2 block leading-snug">{g.title}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {g.issue_number || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatD(g.published_at)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <a
                      href={apiUrl("/api/gazettes/" + g.id + "/download")}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/20 dark:bg-brand/15 dark:text-brand-muted dark:hover:bg-brand/25"
                    >
                      Descargar PDF
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </div>
  );
}
