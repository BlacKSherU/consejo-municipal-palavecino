import { marked } from "marked";
import { apiUrl } from "../lib/api";

const UNSPLASH = [
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&h=900&fit=crop&q=80",
  "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600&h=900&fit=crop&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&h=900&fit=crop&q=80",
];

const GRADS: [string, string][] = [
  ["from-brand/20", "to-brand-teal/20"],
  ["from-brand-teal/20", "to-brand-sky/20"],
  ["from-brand-sky/20", "to-brand-cyan/20"],
];

function formatPublished(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function heroForSlug(slug: string): { src: string; g: [string, string] } {
  const h = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return { src: UNSPLASH[h % UNSPLASH.length], g: GRADS[h % GRADS.length] };
}

function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function textEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

export async function initNewsDetail(rootId = "article-root"): Promise<void> {
  const root = document.getElementById(rootId);
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) {
    clear(root);
    root.appendChild(textEl("p", "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100", "Falta el parámetro slug en la URL."));
    return;
  }

  try {
    const res = await fetch(apiUrl("/api/news/" + encodeURIComponent(slug)));
    if (!res.ok) {
      clear(root);
      root.appendChild(
        textEl("p", "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", "Noticia no encontrada."),
      );
      return;
    }
    const n = (await res.json()) as {
      title?: string;
      excerpt?: string;
      body?: string;
      published_at?: string | null;
    };

    document.title = `${n.title ?? "Noticia"} — Consejo Municipal de Palavecino`;

    const { src: heroSrc, g } = heroForSlug(slug);

    clear(root);

    const wrap = document.createElement("div");
    wrap.className =
      "overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-lg shadow-brand/5 dark:border-slate-700/80 dark:shadow-brand/10";

    const hero = document.createElement("div");
    hero.className = "relative h-52 w-full overflow-hidden bg-muted sm:h-64 md:h-72";
    const img = document.createElement("img");
    img.src = heroSrc;
    img.alt = "";
    img.className = "h-full w-full object-cover";
    hero.appendChild(img);
    const grad = document.createElement("div");
    grad.className = `pointer-events-none absolute inset-0 bg-gradient-to-br ${g[0]} ${g[1]} to-transparent opacity-40 mix-blend-multiply dark:opacity-30 dark:mix-blend-normal`;
    hero.appendChild(grad);
    const heroBottom = document.createElement("div");
    heroBottom.className =
      "pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background via-background/70 to-transparent dark:from-slate-950 dark:via-slate-950/80";
    hero.appendChild(heroBottom);
    wrap.appendChild(hero);

    const inner = document.createElement("div");
    inner.className = "px-6 pb-10 pt-8 sm:px-10 sm:pt-10";

    const meta = document.createElement("p");
    meta.className = "text-xs font-semibold uppercase tracking-[0.2em] text-brand dark:text-brand-muted";
    meta.textContent = "CMP Palavecino · Noticias";
    inner.appendChild(meta);

    const h1 = document.createElement("h1");
    h1.className =
      "mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.35rem] md:leading-tight";
    h1.textContent = n.title ?? "";
    inner.appendChild(h1);

    const dateStr = formatPublished(n.published_at ?? null);
    if (dateStr) {
      const dateEl = document.createElement("time");
      dateEl.dateTime = n.published_at ?? "";
      dateEl.className = "mt-3 block text-sm text-muted-foreground capitalize";
      dateEl.textContent = dateStr;
      inner.appendChild(dateEl);
    }

    const bars = document.createElement("div");
    bars.className = "mt-6 space-y-1";
    const barWidths = [100, 66, 40];
    const barOpac = [0.85, 0.55, 0.35];
    for (let i = 0; i < 3; i++) {
      const b = document.createElement("div");
      b.className = "h-0.5 rounded-full bg-foreground";
      b.style.opacity = String(barOpac[i]);
      b.style.width = `${barWidths[i]}%`;
      bars.appendChild(b);
    }
    inner.appendChild(bars);

    if (n.excerpt?.trim()) {
      const lead = document.createElement("p");
      lead.className =
        "mt-8 text-lg font-medium leading-relaxed text-foreground/90 sm:text-xl border-l-4 border-brand pl-4 dark:border-brand-muted";
      lead.textContent = n.excerpt.trim();
      inner.appendChild(lead);
    }

    const body = document.createElement("div");
    body.className =
      "prose prose-slate mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground prose-a:text-brand prose-strong:text-foreground prose-li:marker:text-brand dark:prose-a:text-brand-sky";
    body.innerHTML = marked.parse(n.body || "", { async: false }) as string;
    inner.appendChild(body);

    wrap.appendChild(inner);
    root.appendChild(wrap);
  } catch {
    clear(root);
    root.appendChild(
      textEl("p", "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100", "Error al cargar la noticia."),
    );
  }
}
