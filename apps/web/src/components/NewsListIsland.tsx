import { useEffect, useMemo, useState } from "react";
import { NewsCards, type NewsCard } from "@/components/ui/news-cards";
import { apiUrl } from "@/lib/api";
import {
  defaultPublicUiConfig,
  mergePublicUiFromApi,
  resolveNewsUi,
  type PublicUiConfig,
} from "@/lib/public-ui";

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

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(iso);
  }
}

export default function NewsListIsland() {
  const [cards, setCards] = useState<NewsCard[]>([]);
  const [totalNews, setTotalNews] = useState(0);
  const [publicUi, setPublicUi] = useState<PublicUiConfig>(defaultPublicUiConfig);
  const [err, setErr] = useState<string | null>(null);

  const newsUi = useMemo(() => resolveNewsUi(publicUi), [publicUi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [newsRes, uiRes] = await Promise.all([
          fetch(apiUrl("/api/news?limit=3&offset=0"), { cache: "no-store" }),
          fetch(apiUrl("/api/public/ui"), { cache: "no-store" }),
        ]);
        const data = (await newsRes.json()) as { items?: unknown[]; total?: number };
        let uiMerged = defaultPublicUiConfig;
        if (uiRes.ok) {
          const u = (await uiRes.json()) as { config?: unknown };
          uiMerged = mergePublicUiFromApi(u.config);
        }
        const items = (data.items || []).slice(0, 3) as { slug: string; title: string; published_at?: string | null }[];
        setTotalNews(typeof data.total === "number" ? data.total : items.length);
        const mapped: NewsCard[] = items.map((n) => {
          const slug = n.slug;
          const h = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const g = GRADS[h % GRADS.length];
          return {
            id: slug,
            slug,
            title: n.title,
            category: "CMP Palavecino",
            subcategory: "Institucional",
            timeAgo: formatTime(n.published_at),
            location: "Palavecino, Lara",
            image: UNSPLASH[h % UNSPLASH.length],
            gradientColors: [g[0], g[1]],
          };
        });
        if (!cancelled) {
          setCards(mapped);
          setPublicUi(uiMerged);
        }
      } catch {
        if (!cancelled) setErr("Error al cargar noticias.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-w-0 flex-1">
        <NewsCards newsCards={cards} enableAnimations hideIntro newsUi={newsUi} />
      </div>
      {totalNews > 3 && (
        <a
          href="/noticias/buscar"
          className="group relative flex min-h-[10rem] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/50 via-background to-background px-4 py-6 text-center shadow-inner transition hover:border-primary/40 hover:from-muted/70 dark:from-slate-800/40 dark:via-background dark:to-background dark:hover:border-primary/30 lg:ml-0 lg:min-h-0 lg:w-28 lg:max-w-[7rem] lg:rounded-l-none lg:border-l-0 lg:py-8"
        >
          <span
            className="text-4xl font-extralight text-muted-foreground transition group-hover:text-primary"
            aria-hidden
          >
            +
          </span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
            Más noticias y búsqueda
          </span>
        </a>
      )}
    </div>
  );
}
