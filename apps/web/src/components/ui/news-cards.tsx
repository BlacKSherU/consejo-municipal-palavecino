import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { BookmarkIcon, X } from "lucide-react";
import { marked } from "marked";
import { useEffect, useState, type MouseEvent } from "react";
import { apiUrl } from "@/lib/api";
import { defaultPublicUiConfig, resolveNewsUi, type ResolvedNewsUi } from "@/lib/public-ui";
import { cn } from "@/lib/utils";

export interface NewsCard {
  id: string;
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  timeAgo: string;
  location: string;
  image: string;
  gradientColors?: string[];
  /** HTML del cuerpo (solo al abrir el modal, desde Markdown). */
  bodyHtml?: string;
}

export interface StatusBar {
  id: string;
  category: string;
  subcategory: string;
  length: number;
  opacity: number;
}

export interface NewsCardsProps {
  title?: string;
  subtitle?: string;
  statusBars?: StatusBar[];
  newsCards?: NewsCard[];
  enableAnimations?: boolean;
  /** Oculta el bloque de título animado (cuando la página ya tiene cabecera hero). */
  hideIntro?: boolean;
  /** Estilos de imagen / modal desde panel admin. */
  newsUi?: ResolvedNewsUi;
}

const defaultStatusBars: StatusBar[] = [
  { id: "1", category: "CMP Palavecino", subcategory: "Comunicación", length: 3, opacity: 1 },
  { id: "2", category: "Consejo Municipal", subcategory: "Transparencia", length: 2, opacity: 0.7 },
  { id: "3", category: "Palavecino", subcategory: "Lara", length: 1, opacity: 0.4 },
];

export function NewsCards({
  title = "Noticias",
  subtitle = "Comunicados del Consejo Municipal de Palavecino",
  statusBars = defaultStatusBars,
  newsCards = [],
  enableAnimations = true,
  hideIntro = false,
  newsUi: newsUiProp,
}: NewsCardsProps) {
  const newsUi = newsUiProp ?? resolveNewsUi(defaultPublicUiConfig);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCard, setSelectedCard] = useState<NewsCard | null>(null);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const toggleBookmark = (cardId: string, e: MouseEvent) => {
    e.stopPropagation();
    setBookmarkedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const openCard = async (card: NewsCard) => {
    setSelectedCard({ ...card, bodyHtml: undefined });
    try {
      const res = await fetch(apiUrl("/api/news/" + encodeURIComponent(card.slug)));
      if (!res.ok) {
        setSelectedCard((prev) =>
          prev && prev.id === card.id
            ? {
                ...prev,
                bodyHtml: "<p class=\"text-muted-foreground\">No se pudo cargar el contenido.</p>",
              }
            : prev,
        );
        return;
      }
      const n = (await res.json()) as { body?: string };
      const raw = (n.body ?? "").trim();
      const bodyHtml = raw.length
        ? (marked.parse(raw, { async: false }) as string)
        : "<p class=\"text-muted-foreground\">Esta noticia aún no tiene cuerpo publicado.</p>";
      setSelectedCard((prev) => (prev && prev.id === card.id ? { ...prev, bodyHtml } : prev));
    } catch {
      setSelectedCard((prev) =>
        prev && prev.id === card.id
          ? {
              ...prev,
              bodyHtml: "<p class=\"text-destructive\">No se pudo cargar el cuerpo de la noticia.</p>",
            }
          : prev,
      );
    }
  };

  const closeCard = () => setSelectedCard(null);

  useEffect(() => {
    if (shouldAnimate) {
      const t = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(t);
    }
    setIsLoaded(true);
    return undefined;
  }, [shouldAnimate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 400, damping: 28, mass: 0.6 },
    },
  };

  const statusBarContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
  };

  const statusBarVariants = {
    hidden: { opacity: 0, scaleX: 0, x: -20 },
    visible: {
      opacity: 1,
      scaleX: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 25 },
    },
  };

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.8 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 28, mass: 0.8 },
    },
  };

  if (newsCards.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl bg-background p-6 text-foreground">
        {!hideIntro && (
          <>
            <h1 className="mb-2 text-4xl font-bold">{title}</h1>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          </>
        )}
        <p className={cn("text-muted-foreground", hideIntro ? "" : "mt-8")}>No hay noticias publicadas.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-6xl bg-background p-6 text-foreground"
      initial={shouldAnimate ? "hidden" : "visible"}
      animate={isLoaded ? "visible" : "hidden"}
      variants={shouldAnimate ? containerVariants : {}}
    >
      {!hideIntro && (
        <motion.div className="mb-8" variants={shouldAnimate ? headerVariants : {}}>
          <h1 className="mb-2 text-4xl font-bold">{title}</h1>
          <p className="text-lg text-muted-foreground">{subtitle}</p>

          <motion.div className="mt-6 space-y-1" variants={shouldAnimate ? statusBarContainerVariants : {}}>
            {statusBars.map((bar, index) => (
              <motion.div
                key={bar.id}
                className={cn(
                  "h-0.5 rounded-full bg-foreground",
                  bar.id === "1" ? "bg-foreground/80" : bar.id === "2" ? "bg-foreground/60" : "bg-foreground/40",
                )}
                style={{
                  opacity: bar.opacity,
                  width: `${(bar.length / 3) * 100}%`,
                }}
                variants={shouldAnimate ? statusBarVariants : {}}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: 0.3 + index * 0.1,
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      <LayoutGroup>
        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:grid-cols-3"
          variants={shouldAnimate ? cardContainerVariants : {}}
        >
          {newsCards.map((card) => {
            if (selectedCard?.id === card.id) return null;
            return (
              <motion.article
                key={card.id}
                layoutId={`card-${card.id}`}
                className={cn(
                  "group cursor-pointer overflow-hidden border border-border/50 bg-card transition-all duration-300",
                  newsUi.cardArticleRounded,
                )}
                variants={shouldAnimate ? cardVariants : {}}
                whileHover={
                  shouldAnimate && newsUi.cardHoverLift
                    ? { y: -4, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }
                    : {}
                }
                onClick={() => void openCard(card)}
              >
                <motion.div layoutId={`card-image-${card.id}`} className={newsUi.cardImageContainerClass}>
                  <img
                    src={card.image}
                    alt=""
                    className={cn(
                      "h-full w-full transform-gpu object-cover transition-transform duration-700 ease-out",
                      newsUi.cardHoverLift && "group-hover:scale-105",
                    )}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-background/80 to-transparent" />
                  {card.gradientColors?.[0] && card.gradientColors[1] && (
                    <div
                      className={`absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t ${card.gradientColors[0]} ${card.gradientColors[1]} to-transparent`}
                    />
                  )}

                  <motion.div
                    className="absolute right-3 top-3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 25 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => toggleBookmark(card.id, e)}
                  >
                    <BookmarkIcon
                      className={cn(
                        "h-5 w-5 cursor-pointer transition-colors",
                        bookmarkedCards.has(card.id)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-white/80 hover:text-white",
                      )}
                    />
                  </motion.div>

                  <motion.div
                    className="absolute bottom-3 left-3 text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="mb-1 text-xs opacity-90">
                      {card.category}, {card.subcategory}
                    </div>
                    <div className="text-xs opacity-75">
                      {card.timeAgo}
                      {card.location ? ` · ${card.location}` : ""}
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div layoutId={`card-content-${card.id}`} className="p-6">
                  <motion.h3
                    layoutId={`card-title-${card.id}`}
                    className="line-clamp-2 text-lg font-semibold leading-tight transition-colors group-hover:text-primary"
                  >
                    {card.title}
                  </motion.h3>
                </motion.div>
              </motion.article>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {selectedCard && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-md dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCard}
                aria-hidden
              />

              <motion.div
                layoutId={`card-${selectedCard.id}`}
                className={cn(
                  "fixed inset-4 z-50 flex max-h-[min(92dvh,880px)] min-h-0 flex-col overflow-hidden border border-border bg-card shadow-2xl md:inset-8 lg:inset-16",
                  newsUi.modalShellRounded,
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={selectedCard ? `modal-news-title-${selectedCard.id}` : undefined}
              >
                <motion.button
                  type="button"
                  className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 hover:bg-background"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeCard}
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </motion.button>

                <motion.div
                  layoutId={`card-image-${selectedCard.id}`}
                  className={cn("w-full shrink-0", newsUi.modalImageContainerClass)}
                >
                  <img src={selectedCard.image} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/90 to-transparent" />
                  {selectedCard.gradientColors?.[0] && selectedCard.gradientColors[1] && (
                    <div
                      className={`absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t ${selectedCard.gradientColors[0]} ${selectedCard.gradientColors[1]} to-transparent`}
                    />
                  )}
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="mb-1 text-sm opacity-90">
                      {selectedCard.category}, {selectedCard.subcategory}
                    </div>
                    <div className="text-sm opacity-75">
                      {selectedCard.timeAgo}
                      {selectedCard.location ? ` · ${selectedCard.location}` : ""}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  layoutId={`card-content-${selectedCard.id}`}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-6"
                >
                  <motion.h1
                    id={`modal-news-title-${selectedCard.id}`}
                    layoutId={`card-title-${selectedCard.id}`}
                    className="shrink-0 pr-8 text-2xl font-bold leading-tight text-foreground md:pr-4 md:text-3xl"
                  >
                    {selectedCard.title}
                  </motion.h1>
                  <p className="mt-2 shrink-0 text-sm text-muted-foreground">
                    Vista previa del inicio. El texto de abajo se muestra con formato, recortado y con desvanecido; el resto de la noticia al pulsar <span className="font-medium">Ver noticia completa</span>.
                  </p>
                  <div className="relative mt-4 min-h-0 w-full min-w-0 flex-1">
                    <div className="relative max-h-[min(14.5rem,32vh)] overflow-hidden rounded-lg border border-border/60 bg-card/80">
                      {selectedCard.bodyHtml === undefined ? (
                        <div className="p-4">
                          <p className="text-sm text-muted-foreground">Cargando contenido…</p>
                        </div>
                      ) : (
                        <div
                          className="prose prose-sm prose-slate max-w-none px-4 py-3 dark:prose-invert prose-headings:mb-2 prose-headings:mt-3 first:prose-headings:mt-0 prose-p:mb-2 prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-brand dark:prose-a:text-brand-sky prose-headings:font-semibold"
                          dangerouslySetInnerHTML={{ __html: selectedCard.bodyHtml }}
                        />
                      )}
                      {selectedCard.bodyHtml !== undefined ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-card to-transparent backdrop-blur-[0.5px] dark:from-slate-950"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <a
                      href={`/noticias/detalle?slug=${encodeURIComponent(selectedCard.slug)}`}
                      className="relative z-[2] mt-4 inline-flex w-full max-w-sm items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 sm:w-auto"
                    >
                      Ver noticia completa
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </motion.div>
  );
}
