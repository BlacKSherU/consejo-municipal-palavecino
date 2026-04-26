import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { BookmarkIcon, X } from "lucide-react";
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
  content?: string[];
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
  /** Estilos de imagen / modal desde panel admin. */
  newsUi?: ResolvedNewsUi;
}

const defaultStatusBars: StatusBar[] = [
  { id: "1", category: "CMP Palavecino", subcategory: "Comunicación", length: 3, opacity: 1 },
  { id: "2", category: "Consejo Municipal", subcategory: "Transparencia", length: 2, opacity: 0.7 },
  { id: "3", category: "Palavecino", subcategory: "Lara", length: 1, opacity: 0.4 },
];

function bodyToParagraphs(body: string): string[] {
  const stripped = body.replace(/^#{1,6}\s+/gm, "").trim();
  const parts = stripped.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [stripped || "Sin contenido."];
}

export function NewsCards({
  title = "Noticias",
  subtitle = "Comunicados del Consejo Municipal de Palavecino",
  statusBars = defaultStatusBars,
  newsCards = [],
  enableAnimations = true,
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
    setSelectedCard(card);
    try {
      const res = await fetch(apiUrl("/api/news/" + encodeURIComponent(card.slug)));
      if (res.ok) {
        const n = (await res.json()) as { body?: string };
        const content = bodyToParagraphs(n.body || "");
        setSelectedCard((prev) => (prev && prev.id === card.id ? { ...prev, content } : prev));
      }
    } catch {
      /* keep excerpt-less modal */
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
        <h1 className="mb-2 text-4xl font-bold">{title}</h1>
        <p className="text-lg text-muted-foreground">{subtitle}</p>
        <p className="mt-8 text-muted-foreground">No hay noticias publicadas.</p>
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
                    className="line-clamp-3 text-lg font-semibold leading-tight transition-colors group-hover:text-primary"
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
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCard}
              />

              <motion.div
                layoutId={`card-${selectedCard.id}`}
                className={cn(
                  "fixed inset-4 z-50 overflow-hidden border border-border bg-card md:inset-8 lg:inset-16",
                  newsUi.modalShellRounded,
                )}
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

                <div className="h-full overflow-y-auto">
                  <motion.div layoutId={`card-image-${selectedCard.id}`} className={newsUi.modalImageContainerClass}>
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

                  <motion.div layoutId={`card-content-${selectedCard.id}`} className="p-6 md:p-8">
                    <motion.h1 layoutId={`card-title-${selectedCard.id}`} className="mb-6 text-2xl font-bold md:text-3xl">
                      {selectedCard.title}
                    </motion.h1>
                    <a
                      href={`/noticias/detalle?slug=${encodeURIComponent(selectedCard.slug)}`}
                      className="mb-6 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Abrir en página completa →
                    </a>
                    <motion.div
                      className="prose prose-slate max-w-none dark:prose-invert prose-p:text-muted-foreground"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      {selectedCard.content?.map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </motion.div>
  );
}
