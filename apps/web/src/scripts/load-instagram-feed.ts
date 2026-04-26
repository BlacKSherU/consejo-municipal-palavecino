import { apiUrl } from "../lib/api";

export function initInstagramFeed(): void {
  void (async () => {
    const root = document.getElementById("ig-feed");
    const status = document.getElementById("ig-status");
    if (!root) return;
    try {
      const res = await fetch(apiUrl("/api/instagram/feed"));
      const data = (await res.json()) as {
        items?: unknown;
        error?: string;
        fetched_at?: string | null;
      };
      const items = data.items || [];
      if (data.error && status) status.textContent = "Aviso: " + data.error;
      else if (status) status.textContent = data.fetched_at ? "Actualizado: " + data.fetched_at : "";
      root.textContent = "";
      const list = Array.isArray(items) ? items : [];
      if (list.length === 0) {
        const p = document.createElement("p");
        p.className = "text-slate-500";
        p.textContent =
          "No hay publicaciones en caché. Configure Meta en el Worker y use «Actualizar» en el panel admin.";
        root.appendChild(p);
        return;
      }
      for (const raw of list.slice(0, 6)) {
        const it = raw as {
          permalink?: string;
          media_type?: string;
          thumbnail_url?: string;
          media_url?: string;
          caption?: string;
        };
        const el = document.createElement("a");
        el.href = it.permalink || "#";
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        el.className =
          "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900";
        const imgUrl = it.media_type === "VIDEO" ? it.thumbnail_url || it.media_url : it.media_url;
        const wrap = document.createElement("div");
        wrap.className = "aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800";
        if (imgUrl) {
          const img = document.createElement("img");
          img.src = imgUrl;
          img.alt = "";
          img.className = "h-full w-full object-cover transition group-hover:scale-105";
          img.loading = "lazy";
          wrap.appendChild(img);
        }
        const cap = document.createElement("p");
        cap.className = "line-clamp-3 p-3 text-xs text-slate-600 dark:text-slate-300";
        cap.textContent = it.caption || "";
        el.appendChild(wrap);
        el.appendChild(cap);
        root.appendChild(el);
      }
    } catch {
      if (status) status.textContent = "No se pudo cargar Instagram.";
    }
  })();
}
