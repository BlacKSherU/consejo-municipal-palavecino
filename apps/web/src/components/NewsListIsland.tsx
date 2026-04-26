import { useEffect, useState } from "react";
import { NewsCards, type NewsCard } from "@/components/ui/news-cards";
import { apiUrl } from "@/lib/api";

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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/news"));
        const data = await res.json();
        const items = data.items || [];
        const mapped: NewsCard[] = items.map((n: { slug: string; title: string; published_at?: string | null }) => {
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
          },
        );
        if (!cancelled) setCards(mapped);
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
  return <NewsCards newsCards={cards} enableAnimations />;
}
