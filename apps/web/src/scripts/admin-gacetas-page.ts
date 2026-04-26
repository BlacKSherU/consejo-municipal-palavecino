import { apiFetch, apiUrl } from "../lib/api";

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

export async function loadGazetteAdminList(): Promise<void> {
  const root = document.getElementById("gazette-list");
  if (!root) return;
  const res = await apiFetch("/api/admin/gazettes");
  const data = (await res.json()) as { items?: Gazette[] };
  const items = data.items || [];
  root.replaceChildren();

  for (const g of items) {
    const row = document.createElement("div");
    row.className =
      "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700";

    const left = document.createElement("div");
    const p1 = document.createElement("p");
    p1.className = "font-medium text-slate-900 dark:text-slate-100";
    p1.textContent = g.title || "";
    const p2 = document.createElement("p");
    p2.className = "text-xs text-slate-500 dark:text-slate-400";
    p2.textContent = `${g.issue_number || "—"} · ${formatDate(g.published_at)}`;
    left.appendChild(p1);
    left.appendChild(p2);

    const right = document.createElement("div");
    right.className = "flex gap-3";
    const link = document.createElement("a");
    link.className = "text-sm text-brand hover:underline";
    link.href = apiUrl("/api/gazettes/" + g.id + "/download");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ver PDF";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "text-sm text-red-600 hover:underline";
    del.dataset.del = String(g.id);
    del.textContent = "Eliminar";
    del.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta gaceta?")) return;
      await apiFetch("/api/admin/gazettes/" + g.id, { method: "DELETE" });
      void loadGazetteAdminList();
    });
    right.appendChild(link);
    right.appendChild(del);

    row.appendChild(left);
    row.appendChild(right);
    root.appendChild(row);
  }
}

export function initAdminGacetasPage(): void {
  document.getElementById("gazette-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const res = await apiFetch("/api/admin/gazettes", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      form.reset();
      void loadGazetteAdminList();
    } else {
      alert("Error al subir");
    }
  });

  void loadGazetteAdminList();
}
