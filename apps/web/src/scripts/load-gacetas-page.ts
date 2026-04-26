import { apiUrl } from "../lib/api";

type Gazette = {
  id: number;
  title: string;
  issue_number: string;
  published_at: string;
};

/** dd/mm/aaaa (UTC sobre el ISO guardado). */
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

function textCell(text: string, extraClass = ""): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = `px-4 py-3 align-middle text-slate-700 dark:text-slate-200 ${extraClass}`.trim();
  td.textContent = text;
  return td;
}

export async function initGacetasPage(): Promise<void> {
  const tbody = document.getElementById("gazette-rows");
  const err = document.getElementById("gazette-err");
  if (!tbody) return;
  if (err) err.textContent = "";

  try {
    const res = await fetch(apiUrl("/api/gazettes"));
    const data = (await res.json()) as { items?: Gazette[] };
    const items = data.items || [];
    tbody.replaceChildren();

    if (items.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400";
      td.textContent = "No hay gacetas publicadas.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const g of items) {
      const tr = document.createElement("tr");
      tr.className =
        "border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40";

      const tdTitle = textCell(g.title || "", "max-w-[min(28rem,40vw)] font-medium text-slate-900 dark:text-slate-50");
      const tdNum = textCell(g.issue_number || "—", "whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300");
      const tdDate = textCell(formatDate(g.published_at), "whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300");

      const tdLink = document.createElement("td");
      tdLink.className = "px-4 py-3 align-middle";
      const a = document.createElement("a");
      a.href = apiUrl("/api/gazettes/" + g.id + "/download");
      a.rel = "noopener noreferrer";
      a.className =
        "inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/20 dark:bg-brand/15 dark:text-brand-muted dark:hover:bg-brand/25";
      a.textContent = "Descargar PDF";
      a.setAttribute("download", "");
      tdLink.appendChild(a);

      tr.appendChild(tdTitle);
      tr.appendChild(tdNum);
      tr.appendChild(tdDate);
      tr.appendChild(tdLink);
      tbody.appendChild(tr);
    }
  } catch {
    if (err) err.textContent = "Error al cargar gacetas.";
  }
}
