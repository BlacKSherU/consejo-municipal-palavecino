import { apiUrl } from "../lib/api";

export type HomePageContent = {
  hero_badge: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_lead: string;
  btn_noticias: string;
  btn_gacetas: string;
  btn_noticias_href: string;
  btn_gacetas_href: string;
  hero_card_text: string;
  mission_h2: string;
  mission_text: string;
  ig_h2: string;
  ig_lead: string;
};

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setLink(id: string, text: string, href: string) {
  const el = document.getElementById(id);
  if (el && el instanceof HTMLAnchorElement) {
    el.textContent = text;
    el.setAttribute("href", href);
  }
}

export async function initHomePage(): Promise<void> {
  try {
    const res = await fetch(apiUrl("/api/site/home"), { cache: "no-store" });
    if (!res.ok) throw new Error("fetch");
    const h = (await res.json()) as HomePageContent;

    setText("home-hero-badge", h.hero_badge);
    setText("home-hero-t1", h.hero_title_1);
    setText("home-hero-t2", h.hero_title_2);
    setText("home-hero-lead", h.hero_lead);
    setLink("home-btn-noticias", h.btn_noticias, h.btn_noticias_href);
    setLink("home-btn-gacetas", h.btn_gacetas, h.btn_gacetas_href);
    setText("home-hero-card-text", h.hero_card_text);
    setText("home-mission-h2", h.mission_h2);
    setText("home-mission-text", h.mission_text);
    setText("home-ig-h2", h.ig_h2);
    setText("home-ig-lead", h.ig_lead);
  } catch {
    /* mantiene el HTML estático */
  }
}
