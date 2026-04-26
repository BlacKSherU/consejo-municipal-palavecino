import { marked } from "marked";
import { apiUrl } from "../lib/api";

type Bundle = {
  body?: string;
  mission?: string;
  vision?: string;
  images?: { url: string; alt: string }[];
};

function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export async function initAboutPage(rootId = "about-page-root"): Promise<void> {
  const root = document.getElementById(rootId);
  if (!root) return;

  try {
    const res = await fetch(apiUrl("/api/site/about"));
    if (!res.ok) throw new Error("fetch");
    const data = (await res.json()) as Bundle;

    clear(root);

    const wrap = document.createElement("div");
    wrap.className = "space-y-12 sm:space-y-16";

    const head = document.createElement("header");
    head.className = "text-center";
    const kicker = document.createElement("p");
    kicker.className =
      "text-xs font-semibold uppercase tracking-[0.25em] text-brand dark:text-brand-muted";
    kicker.textContent = "Consejo Municipal de Palavecino";
    head.appendChild(kicker);
    const h1 = document.createElement("h1");
    h1.className =
      "mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl";
    h1.textContent = "Quiénes somos";
    head.appendChild(h1);
    const sub = document.createElement("p");
    sub.className = "mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400";
    sub.textContent =
      "Identidad institucional, propósito y horizonte del Consejo Municipal Bolivariano de Palavecino.";
    head.appendChild(sub);

    const bars = document.createElement("div");
    bars.className = "mx-auto mt-8 max-w-md space-y-1";
    [100, 72, 48].forEach((w, i) => {
      const b = document.createElement("div");
      b.className = "mx-auto h-0.5 rounded-full bg-brand dark:bg-brand-muted";
      b.style.width = `${w}%`;
      b.style.opacity = String(1 - i * 0.25);
      bars.appendChild(b);
    });
    head.appendChild(bars);
    wrap.appendChild(head);

    const mv = document.createElement("div");
    mv.className = "grid gap-6 md:grid-cols-2 md:gap-8";

    const card = (title: string, text: string, accent: "brand" | "teal") => {
      const c = document.createElement("div");
      c.className =
        "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-950/90";
      const bar = document.createElement("div");
      bar.className = `absolute left-0 top-0 h-1 w-full ${accent === "brand" ? "bg-brand" : "bg-brand-teal"}`;
      c.appendChild(bar);
      const th = document.createElement("h2");
      th.className = "text-xl font-bold text-slate-900 dark:text-white";
      th.textContent = title;
      c.appendChild(th);
      const tp = document.createElement("p");
      tp.className = "mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300";
      tp.textContent = text.trim() || "Configure este texto en el panel de administración.";
      c.appendChild(tp);
      return c;
    };

    mv.appendChild(card("Misión", data.mission ?? "", "brand"));
    mv.appendChild(card("Visión", data.vision ?? "", "teal"));
    wrap.appendChild(mv);

    const imgs = Array.isArray(data.images) ? data.images : [];
    if (imgs.length > 0) {
      const sec = document.createElement("section");
      sec.setAttribute("aria-labelledby", "about-gallery-title");
      const gh = document.createElement("h2");
      gh.id = "about-gallery-title";
      gh.className = "text-center text-2xl font-bold text-slate-900 dark:text-white";
      gh.textContent = "Imágenes";
      sec.appendChild(gh);
      const gp = document.createElement("p");
      gp.className = "mx-auto mt-2 max-w-xl text-center text-sm text-slate-500 dark:text-slate-400";
      gp.textContent = "Galería configurable desde administración (enlaces HTTPS).";
      sec.appendChild(gp);

      const grid = document.createElement("div");
      grid.className = "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
      for (const im of imgs) {
        const fig = document.createElement("figure");
        fig.className =
          "group overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-md dark:border-slate-700 dark:bg-slate-800/50";
        const img = document.createElement("img");
        img.src = im.url;
        img.alt = im.alt || "";
        img.loading = "lazy";
        img.className =
          "aspect-[4/3] h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]";
        fig.appendChild(img);
        if (im.alt) {
          const cap = document.createElement("figcaption");
          cap.className = "px-3 py-2 text-center text-xs text-slate-600 dark:text-slate-400";
          cap.textContent = im.alt;
          fig.appendChild(cap);
        }
        grid.appendChild(fig);
      }
      sec.appendChild(grid);
      wrap.appendChild(sec);
    }

    const article = document.createElement("section");
    article.setAttribute("aria-labelledby", "about-content-title");
    const ah = document.createElement("h2");
    ah.id = "about-content-title";
    ah.className = "text-2xl font-bold text-slate-900 dark:text-white";
    ah.textContent = "Nuestra historia e información";
    article.appendChild(ah);
    const prose = document.createElement("div");
    prose.className =
      "prose prose-slate mt-6 max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-brand dark:prose-a:text-brand-sky prose-strong:text-slate-900 dark:prose-strong:text-white";
    prose.innerHTML = marked.parse(data.body || "", { async: false }) as string;
    article.appendChild(prose);
    wrap.appendChild(article);

    root.appendChild(wrap);
  } catch {
    clear(root);
    const p = document.createElement("p");
    p.className = "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100";
    p.textContent = "No se pudo cargar el contenido.";
    root.appendChild(p);
  }
}
