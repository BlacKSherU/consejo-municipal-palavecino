import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "./env";
import { hashPassword, verifyPassword } from "./password";
import { signToken, verifyToken } from "./jwt";
import { refreshInstagramCache } from "./instagram";

type Variables = {
  adminUserId: number;
  adminEmail: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

function normalizeOrigin(o: string): string {
  return o.trim().replace(/\/$/, "");
}

/** Orígenes permitidos (sin barra final). Si CORS_ORIGIN está vacío en producción, solo localhost. */
function corsOrigins(env: Env): string[] {
  const raw = env.CORS_ORIGIN?.trim();
  if (!raw) return ["http://localhost:4321", "http://127.0.0.1:4321"];
  return raw.split(",").map((s) => normalizeOrigin(s)).filter(Boolean);
}

/** Primera imagen de Markdown `![](url)` o `![alt](url)` en el cuerpo. */
function firstMarkdownImageUrl(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/.exec(body);
  return m?.[1] ?? null;
}

app.use("*", async (c, next) => {
  const allowed = corsOrigins(c.env);
  return cors({
    origin: (origin) => {
      if (!origin) return allowed[0] ?? "";
      const o = normalizeOrigin(origin);
      if (allowed.includes(o)) return origin;
      return false;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
  })(c, next);
});

/** Comprueba que el Worker desplegado es el correcto (al abrir la URL base en el navegador o con curl). */
app.get("/", (c) =>
  c.json({
    ok: true,
    service: "cmp-api",
    project: "Consejo Municipal de Palavecino",
    check: { health: "/health", publicApi: "GET /api/site/home", adminRequiresAuth: "GET /api/admin/*" },
  })
);

app.get("/health", (c) => c.json({ ok: true }));

function slugify(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "item";
}

/** Presets de apariencia pública (noticias + consejo). Validado en PUT. */
const NEWS_IMG = ["short", "medium", "tall", "verytall"] as const;
const CORNERS = ["none", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
const COUNCIL_PRESET = ["compact", "default", "large"] as const;
const MODAL_W = ["sm", "md", "lg", "xl"] as const;

type NewsImg = (typeof NEWS_IMG)[number];
type Corner = (typeof CORNERS)[number];
type CouncilPreset = (typeof COUNCIL_PRESET)[number];
type ModalW = (typeof MODAL_W)[number];

type PublicUiStored = {
  version: number;
  news: {
    cardImage: NewsImg;
    cardCorner: Corner;
    modalImage: NewsImg;
    modalCorner: Corner;
    cardHoverLift: boolean;
  };
  council: {
    photoCorner: Corner;
    photoPreset: CouncilPreset;
    modalCorner: Corner;
    modalWidth: ModalW;
    photoGrayscale: boolean;
  };
};

const DEFAULT_PUBLIC_UI: PublicUiStored = {
  version: 1,
  news: {
    cardImage: "tall",
    cardCorner: "lg",
    modalImage: "tall",
    modalCorner: "xl",
    cardHoverLift: true,
  },
  council: {
    photoCorner: "xl",
    photoPreset: "default",
    modalCorner: "xl",
    modalWidth: "md",
    photoGrayscale: false,
  },
};

function pickEnum<T extends string>(allowed: readonly T[], v: unknown, fallback: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  return fallback;
}

function mergePublicUi(raw: unknown): PublicUiStored {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const news = o.news && typeof o.news === "object" ? (o.news as Record<string, unknown>) : {};
  const council = o.council && typeof o.council === "object" ? (o.council as Record<string, unknown>) : {};
  return {
    version: 1,
    news: {
      cardImage: pickEnum(NEWS_IMG, news.cardImage, DEFAULT_PUBLIC_UI.news.cardImage),
      cardCorner: pickEnum(CORNERS, news.cardCorner, DEFAULT_PUBLIC_UI.news.cardCorner),
      modalImage: pickEnum(NEWS_IMG, news.modalImage, DEFAULT_PUBLIC_UI.news.modalImage),
      modalCorner: pickEnum(CORNERS, news.modalCorner, DEFAULT_PUBLIC_UI.news.modalCorner),
      cardHoverLift: typeof news.cardHoverLift === "boolean" ? news.cardHoverLift : DEFAULT_PUBLIC_UI.news.cardHoverLift,
    },
    council: {
      photoCorner: pickEnum(CORNERS, council.photoCorner, DEFAULT_PUBLIC_UI.council.photoCorner),
      photoPreset: pickEnum(COUNCIL_PRESET, council.photoPreset, DEFAULT_PUBLIC_UI.council.photoPreset),
      modalCorner: pickEnum(CORNERS, council.modalCorner, DEFAULT_PUBLIC_UI.council.modalCorner),
      modalWidth: pickEnum(MODAL_W, council.modalWidth, DEFAULT_PUBLIC_UI.council.modalWidth),
      photoGrayscale:
        typeof council.photoGrayscale === "boolean" ? council.photoGrayscale : DEFAULT_PUBLIC_UI.council.photoGrayscale,
    },
  };
}

async function loadPublicUiFromDb(db: D1Database): Promise<PublicUiStored> {
  const row = await db.prepare(`SELECT body FROM site_content WHERE key = 'public_ui'`).first<{ body: string }>();
  if (!row?.body) return DEFAULT_PUBLIC_UI;
  try {
    return mergePublicUi(JSON.parse(row.body));
  } catch {
    return DEFAULT_PUBLIC_UI;
  }
}

/** Imagen: URL externa (https) o clave R2 bajo about/gallery/ (subida en admin). */
type AboutImage = { alt: string; url?: string; key?: string };

const ABOUT_GALLERY_KEY_RE = /^about\/gallery\/[a-zA-Z0-9._-]+$/;

function parseOneAboutImageItem(o: { url?: unknown; key?: unknown; alt?: unknown }): AboutImage | null {
  const alt = typeof o.alt === "string" ? o.alt.trim() : "";
  if (alt.length > 240) return null;
  const url = typeof o.url === "string" ? o.url.trim() : "";
  const key = typeof o.key === "string" ? o.key.trim() : "";
  if (key) {
    if (url) return null;
    if (!ABOUT_GALLERY_KEY_RE.test(key)) return null;
    return { key, alt: alt.slice(0, 240) };
  }
  if (url) {
    if (key) return null;
    if (!/^https:\/\//i.test(url) || url.length > 2048) return null;
    return { url, alt: alt.slice(0, 240) };
  }
  return null;
}

function parseAboutImages(raw: string | undefined): AboutImage[] {
  if (!raw?.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: AboutImage[] = [];
    for (const item of j) {
      if (!item || typeof item !== "object") continue;
      const p = parseOneAboutImageItem(item as { url?: unknown; key?: unknown; alt?: unknown });
      if (p) out.push(p);
      if (out.length >= 12) break;
    }
    return out;
  } catch {
    return [];
  }
}

function validateAboutImagesInput(raw: unknown): AboutImage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AboutImage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const p = parseOneAboutImageItem(item as { url?: unknown; key?: unknown; alt?: unknown });
    if (!p) return null;
    out.push(p);
    if (out.length > 12) return null;
  }
  return out;
}

function aboutImageR2Keys(imgs: AboutImage[]): string[] {
  return imgs.map((i) => i.key).filter((k): k is string => typeof k === "string" && k.length > 0);
}

async function loadAboutBundle(db: D1Database) {
  const rows = await db.prepare(
    `SELECT key, body, updated_at FROM site_content WHERE key IN (
      'about','about_mission','about_vision','about_images','about_kicker','about_hero'
    )`,
  ).all<{ key: string; body: string; updated_at: string }>();
  const m = new Map((rows.results ?? []).map((r) => [r.key, r]));
  const about = m.get("about");
  const mission = m.get("about_mission");
  const vision = m.get("about_vision");
  const imgs = m.get("about_images");
  const kicker = m.get("about_kicker");
  const hero = m.get("about_hero");
  return {
    body: about?.body ?? "",
    mission: mission?.body ?? "",
    vision: vision?.body ?? "",
    kicker: kicker?.body?.trim() ?? "Consejo Municipal de Palavecino",
    hero:
      hero?.body?.trim() ??
      "Identidad institucional, propósito y horizonte del Consejo Municipal Bolivariano de Palavecino.",
    images: parseAboutImages(imgs?.body),
    updated_at: about?.updated_at ?? null,
  };
}

type HomePageContent = {
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

const DEFAULT_HOME_PAGE: HomePageContent = {
  hero_badge: "Portal institucional",
  hero_title_1: "Consejo Municipal Bolivariano",
  hero_title_2: "de Palavecino",
  hero_lead:
    "Servimos con transparencia, participación y compromiso con el desarrollo local. Conozca nuestro trabajo y conéctese con el consejo.",
  btn_noticias: "Noticias",
  btn_gacetas: "Gacetas oficiales",
  btn_noticias_href: "/noticias",
  btn_gacetas_href: "/gacetas",
  hero_card_text: "Juntos construimos el futuro de nuestro municipio.",
  mission_h2: "Nuestra misión",
  mission_text:
    "Ejercer funciones legislativas y de control con integridad, apertura y cercanía con el pueblo, fortaleciendo la democracia participativa local.",
  ig_h2: "Instagram",
  ig_lead: "Publicaciones recientes (sincronizadas desde la cuenta oficial).",
};

function isSafeInternalHref(h: string): boolean {
  if (h.length > 500) return false;
  if (!h.startsWith("/") || h.startsWith("//")) return false;
  if (/^(javascript|data|vbscript):/i.test(h) || h.includes("javascript:")) return false;
  if (h.includes(" ") || h.includes("\n")) return false;
  return true;
}

function mergeHomePageJson(raw: string | null | undefined): HomePageContent {
  if (!raw?.trim()) return { ...DEFAULT_HOME_PAGE };
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const out: HomePageContent = { ...DEFAULT_HOME_PAGE };
    (Object.keys(DEFAULT_HOME_PAGE) as (keyof HomePageContent)[]).forEach((k) => {
      const v = p[k as string];
      if (typeof v === "string") (out as Record<string, string>)[k] = v;
    });
    return out;
  } catch {
    return { ...DEFAULT_HOME_PAGE };
  }
}

function parseHomePagePutBody(raw: unknown): HomePageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const s = (k: keyof HomePageContent): string | null => {
    const v = o[k as string];
    return typeof v === "string" ? v : null;
  };
  const limits: Record<keyof HomePageContent, number> = {
    hero_badge: 300,
    hero_title_1: 300,
    hero_title_2: 300,
    hero_lead: 3_000,
    btn_noticias: 120,
    btn_gacetas: 120,
    btn_noticias_href: 500,
    btn_gacetas_href: 500,
    hero_card_text: 800,
    mission_h2: 300,
    mission_text: 3_000,
    ig_h2: 200,
    ig_lead: 1_000,
  };
  const out: HomePageContent = { ...DEFAULT_HOME_PAGE };
  for (const k of Object.keys(DEFAULT_HOME_PAGE) as (keyof HomePageContent)[]) {
    const v = s(k);
    if (v === null) return null;
    if (v.length > limits[k]) return null;
    (out as Record<string, string>)[k] = v;
  }
  if (!isSafeInternalHref(out.btn_noticias_href) || !isSafeInternalHref(out.btn_gacetas_href)) return null;
  return out;
}

async function loadHomePageFromDb(db: D1Database): Promise<HomePageContent> {
  const row = await db.prepare(`SELECT body FROM site_content WHERE key = 'home_page'`).first<{
    body: string;
  }>();
  return mergeHomePageJson(row?.body);
}

async function getAuth(c: Context<{ Bindings: Env }>): Promise<{ id: number; email: string } | null> {
  const auth = c.req.raw.headers.get("Authorization");
  let token: string | null = null;
  if (auth?.startsWith("Bearer ")) token = auth.slice(7);
  if (!token) token = getCookie(c, "auth_token") ?? null;
  if (!token) return null;
  const payload = await verifyToken(c.env, token);
  if (!payload) return null;
  const id = Number(payload.sub);
  if (!Number.isFinite(id)) return null;
  return { id, email: payload.email };
}

const requireAdmin = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: () => Promise<void>) => {
  const u = await getAuth(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  c.set("adminUserId", u.id);
  c.set("adminEmail", u.email);
  await next();
};

// --- Public: site content ---
app.get("/api/site/about", async (c) => {
  c.header("Cache-Control", "no-store");
  const bundle = await loadAboutBundle(c.env.DB);
  return c.json(bundle);
});

app.get("/api/site/home", async (c) => {
  c.header("Cache-Control", "no-store");
  return c.json(await loadHomePageFromDb(c.env.DB));
});

/** Foto de galería «Quiénes somos» (R2). Público; solo claves bajo about/gallery/. */
app.get("/api/site/about/photo", async (c) => {
  const key = (c.req.query("key") ?? "").trim();
  if (!key || !ABOUT_GALLERY_KEY_RE.test(key)) return c.json({ error: "Invalid key" }, 400);
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

app.get("/api/public/ui", async (c) => {
  const config = await loadPublicUiFromDb(c.env.DB);
  return c.json({ config });
});

// --- Public: news (q= búsqueda; page+perPage paginación; limit+offset vista previa) ---
app.get("/api/news", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const pageQ = c.req.query("page");
  const perPageQ = c.req.query("perPage") ?? c.req.query("per_page");
  const limitQ = c.req.query("limit");
  const offsetQ = c.req.query("offset");
  const hasPage = pageQ != null && pageQ !== "";
  const hasLimit = limitQ != null && limitQ !== "";

  const perPage = Math.min(50, Math.max(1, parseInt(String(perPageQ ?? "10"), 10) || 10));
  const orderSql =
    "ORDER BY CASE WHEN published_at IS NULL THEN 1 ELSE 0 END, datetime(published_at) DESC, id DESC";

  let whereSql = "published = 1";
  const binds: (string | number)[] = [];
  if (q.length > 0) {
    const like = `%${q.replace(/"/g, "")}%`;
    whereSql +=
      " AND (title LIKE ? OR excerpt LIKE ? OR slug LIKE ? OR (published_at IS NOT NULL AND published_at LIKE ?))";
    binds.push(like, like, like, like);
  }

  const countRow = await c.env.DB
    .prepare(`SELECT COUNT(*) as c FROM news WHERE ${whereSql}`)
    .bind(...binds)
    .first<{ c: number }>();
  const total = countRow?.c ?? 0;

  const baseSelect = `SELECT id, slug, title, excerpt, body, published_at, updated_at FROM news WHERE ${whereSql} ${orderSql}`;

  type NewsRow = {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    published_at: string | null;
    updated_at: string;
  };

  function mapNewsList(rows: NewsRow[] | null | undefined) {
    return (rows ?? []).map((row) => {
      const { body, ...rest } = row;
      return { ...rest, image_url: firstMarkdownImageUrl(body) };
    });
  }

  if (hasPage) {
    const page = Math.max(1, parseInt(String(pageQ), 10) || 1);
    const offset = (page - 1) * perPage;
    const listBinds = [...binds, perPage, offset];
    const rows = await c.env.DB.prepare(`${baseSelect} LIMIT ? OFFSET ?`).bind(...listBinds).all<NewsRow>();
    return c.json({
      items: mapNewsList(rows.results),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }
  if (hasLimit) {
    const limit = Math.min(100, Math.max(1, parseInt(String(limitQ), 10) || 10));
    const offset = Math.max(0, parseInt(String(offsetQ ?? "0"), 10) || 0);
    const listBinds = [...binds, limit, offset];
    const rows = await c.env.DB.prepare(`${baseSelect} LIMIT ? OFFSET ?`).bind(...listBinds).all<NewsRow>();
    return c.json({ items: mapNewsList(rows.results), total, limit, offset });
  }
  const rows = await c.env.DB.prepare(baseSelect).bind(...binds).all<NewsRow>();
  return c.json({ items: mapNewsList(rows.results), total });
});

app.get("/api/news/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await c.env.DB.prepare(
    `SELECT id, slug, title, excerpt, body, published_at, updated_at FROM news WHERE slug = ? AND published = 1`
  )
    .bind(slug)
    .first<{
      id: number;
      slug: string;
      title: string;
      excerpt: string;
      body: string;
      published_at: string | null;
      updated_at: string;
    }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// --- Public: council ---
app.get("/api/council", async (c) => {
  const positions = await c.env.DB.prepare(
    `SELECT id, name, sort_order FROM council_positions ORDER BY sort_order ASC, id ASC`
  ).all<{ id: number; name: string; sort_order: number }>();
  const members = await c.env.DB.prepare(
    `SELECT id, position_id, full_name, bio, photo_key, email, phone, sort_order FROM council_members ORDER BY sort_order ASC, id ASC`
  ).all<{
    id: number;
    position_id: number;
    full_name: string;
    bio: string;
    photo_key: string | null;
    email: string | null;
    phone: string | null;
    sort_order: number;
  }>();

  const posList = positions.results ?? [];
  const memList = members.results ?? [];
  const withMembers = posList.map((p) => ({
    ...p,
    members: memList.filter((m) => m.position_id === p.id),
  }));
  return c.json({ positions: withMembers });
});

// --- Public: gazettes list (mismos parámetros q / page / perPage / limit+offset) ---
app.get("/api/gazettes", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const pageQ = c.req.query("page");
  const perPageQ = c.req.query("perPage") ?? c.req.query("per_page");
  const limitQ = c.req.query("limit");
  const offsetQ = c.req.query("offset");
  const hasPage = pageQ != null && pageQ !== "";
  const hasLimit = limitQ != null && limitQ !== "";
  const perPage = Math.min(50, Math.max(1, parseInt(String(perPageQ ?? "10"), 10) || 10));
  const orderSql = "ORDER BY datetime(published_at) DESC, id DESC";

  let whereSql = "1=1";
  const binds: (string | number)[] = [];
  if (q.length > 0) {
    const like = `%${q.replace(/"/g, "")}%`;
    whereSql +=
      " AND (title LIKE ? OR issue_number LIKE ? OR file_name LIKE ? OR (published_at IS NOT NULL AND published_at LIKE ?))";
    binds.push(like, like, like, like);
  }

  const countRow = await c.env.DB
    .prepare(`SELECT COUNT(*) as c FROM gazettes WHERE ${whereSql}`)
    .bind(...binds)
    .first<{ c: number }>();
  const total = countRow?.c ?? 0;

  const baseSelect = `SELECT id, title, issue_number, published_at, file_name, file_size, mime FROM gazettes WHERE ${whereSql} ${orderSql}`;

  type GazRow = {
    id: number;
    title: string;
    issue_number: string;
    published_at: string;
    file_name: string;
    file_size: number;
    mime: string;
  };

  if (hasPage) {
    const page = Math.max(1, parseInt(String(pageQ), 10) || 1);
    const offset = (page - 1) * perPage;
    const listBinds = [...binds, perPage, offset];
    const rows = await c.env.DB.prepare(`${baseSelect} LIMIT ? OFFSET ?`).bind(...listBinds).all<GazRow>();
    return c.json({
      items: rows.results ?? [],
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }
  if (hasLimit) {
    const limit = Math.min(100, Math.max(1, parseInt(String(limitQ), 10) || 10));
    const offset = Math.max(0, parseInt(String(offsetQ ?? "0"), 10) || 0);
    const listBinds = [...binds, limit, offset];
    const rows = await c.env.DB.prepare(`${baseSelect} LIMIT ? OFFSET ?`).bind(...listBinds).all<GazRow>();
    return c.json({ items: rows.results ?? [], total, limit, offset });
  }
  const rows = await c.env.DB.prepare(baseSelect).bind(...binds).all<GazRow>();
  return c.json({ items: rows.results ?? [], total });
});

app.get("/api/gazettes/:id/download", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);
  const row = await c.env.DB.prepare(`SELECT r2_key, file_name, mime FROM gazettes WHERE id = ?`)
    .bind(id)
    .first<{ r2_key: string; file_name: string; mime: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  const obj = await c.env.BUCKET.get(row.r2_key);
  if (!obj) return c.json({ error: "File missing" }, 404);
  const safeName = row.file_name.replace(/[^\w.\-]+/g, "_");
  return new Response(obj.body, {
    headers: {
      "Content-Type": row.mime || "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
});

// --- Public: Instagram (cached) ---
app.get("/api/instagram/feed", async (c) => {
  const row = await c.env.DB.prepare(`SELECT payload, error, fetched_at FROM instagram_cache WHERE id = 1`).first<{
    payload: string;
    error: string | null;
    fetched_at: string | null;
  }>();
  if (!row) return c.json({ items: [], error: null, fetched_at: null });
  try {
    const parsed = JSON.parse(row.payload) as unknown;
    let items: unknown[] = [];
    let fetchedAt: string | null = null;
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === "object") {
      const o = parsed as { items?: unknown[]; fetchedAt?: string };
      if (Array.isArray(o.items)) items = o.items;
      if (typeof o.fetchedAt === "string") fetchedAt = o.fetchedAt;
    }
    return c.json({
      items,
      error: row.error,
      fetched_at: row.fetched_at ?? fetchedAt,
    });
  } catch {
    return c.json({ items: [], error: row.error, fetched_at: row.fetched_at });
  }
});

// --- Auth ---
app.post("/api/auth/login", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return c.json({ error: "Email and password required" }, 400);

  const row = await c.env.DB.prepare(`SELECT id, email, password_record FROM admin_users WHERE email = ?`)
    .bind(email)
    .first<{ id: number; email: string; password_record: string }>();
  if (!row || !(await verifyPassword(password, row.password_record))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signToken(c.env, row.id, row.email);
  const url = new URL(c.req.url);
  const secure = url.protocol === "https:";
  setCookie(c, "auth_token", token, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({ ok: true, token, user: { id: row.id, email: row.email } });
});

app.post("/api/auth/logout", async (c) => {
  const url = new URL(c.req.url);
  const secure = url.protocol === "https:";
  setCookie(c, "auth_token", "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const u = await getAuth(c);
  if (!u) return c.json({ user: null });
  const row = await c.env.DB.prepare(`SELECT id, email FROM admin_users WHERE id = ?`)
    .bind(u.id)
    .first<{ id: number; email: string }>();
  return c.json({ user: row ?? null });
});

// --- Admin ---
app.use("/api/admin/*", requireAdmin);

app.get("/api/admin/site/about", async (c) => {
  const bundle = await loadAboutBundle(c.env.DB);
  return c.json(bundle);
});

app.post("/api/admin/site/about/gallery", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!file || typeof file === "string") return c.json({ error: "file required" }, 400);
  const f = file as File;
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `about/gallery/${crypto.randomUUID()}.${ext || "jpg"}`;
  await c.env.BUCKET.put(key, f.stream(), {
    httpMetadata: { contentType: f.type || "image/jpeg" },
  });
  return c.json({ ok: true, key });
});

app.put("/api/admin/site/about", async (c) => {
  let body: {
    body?: string;
    mission?: string;
    vision?: string;
    kicker?: string;
    hero?: string;
    images?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const text = String(body.body ?? "");
  if (text.length > 200_000) return c.json({ error: "body too long" }, 400);
  const mission = String(body.mission ?? "");
  const vision = String(body.vision ?? "");
  if (mission.length > 12_000 || vision.length > 12_000) return c.json({ error: "mission/vision too long" }, 400);
  const kicker = String(body.kicker ?? "");
  const hero = String(body.hero ?? "");
  if (kicker.length > 500 || hero.length > 2_000) return c.json({ error: "kicker/hero too long" }, 400);

  let oldKeys: string[] = [];
  if (body.images !== undefined) {
    const oldRow = await c.env.DB.prepare(`SELECT body FROM site_content WHERE key = 'about_images'`)
      .first<{ body: string }>();
    oldKeys = aboutImageR2Keys(parseAboutImages(oldRow?.body));
  }

  const imgs = body.images !== undefined ? validateAboutImagesInput(body.images) : null;
  if (body.images !== undefined && imgs === null) return c.json({ error: "invalid images" }, 400);

  const stm = `INSERT INTO site_content (key, body, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = datetime('now')`;

  await c.env.DB.prepare(stm).bind("about", text).run();
  await c.env.DB.prepare(stm).bind("about_mission", mission).run();
  await c.env.DB.prepare(stm).bind("about_vision", vision).run();
  await c.env.DB.prepare(stm).bind("about_kicker", kicker).run();
  await c.env.DB.prepare(stm).bind("about_hero", hero).run();
  if (imgs !== null) {
    const newKeys = aboutImageR2Keys(imgs);
    for (const k of oldKeys) {
      if (!newKeys.includes(k)) await c.env.BUCKET.delete(k);
    }
    await c.env.DB.prepare(stm).bind("about_images", JSON.stringify(imgs)).run();
  }
  const bundle = await loadAboutBundle(c.env.DB);
  return c.json({ ok: true, ...bundle });
});

app.get("/api/admin/site/home", async (c) => {
  return c.json(await loadHomePageFromDb(c.env.DB));
});

app.put("/api/admin/site/home", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const h = parseHomePagePutBody(body);
  if (!h) return c.json({ error: "invalid home content" }, 400);
  const json = JSON.stringify(h);
  if (json.length > 50_000) return c.json({ error: "payload too large" }, 400);
  await c.env.DB
    .prepare(
      `INSERT INTO site_content (key, body, updated_at) VALUES ('home_page', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = datetime('now')`
    )
    .bind(json)
    .run();
  return c.json({ ok: true, ...h });
});

app.get("/api/admin/site/public-ui", async (c) => {
  const row = await c.env.DB.prepare(`SELECT body, updated_at FROM site_content WHERE key = 'public_ui'`).first<{
    body: string;
    updated_at: string;
  }>();
  const config = await loadPublicUiFromDb(c.env.DB);
  return c.json({ config, updated_at: row?.updated_at ?? null });
});

app.put("/api/admin/site/public-ui", async (c) => {
  let body: { config?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const config = mergePublicUi(body.config);
  const json = JSON.stringify(config);
  await c.env.DB.prepare(
    `INSERT INTO site_content (key, body, updated_at) VALUES ('public_ui', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = datetime('now')`
  )
    .bind(json)
    .run();
  return c.json({ ok: true, config });
});

// Admin news
app.get("/api/admin/news", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, slug, title, excerpt, body, published, published_at, created_at, updated_at FROM news ORDER BY id DESC`
  ).all();
  return c.json({ items: rows.results ?? [] });
});

app.post("/api/admin/news", async (c) => {
  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    published?: boolean;
    published_at?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const title = String(body.title ?? "").trim();
  if (!title) return c.json({ error: "title required" }, 400);
  let slug = (body.slug && String(body.slug).trim()) || slugify(title);
  const excerpt = String(body.excerpt ?? "");
  const content = String(body.body ?? "");
  const published = body.published ? 1 : 0;
  const publishedAt =
    body.published_at != null && body.published_at !== ""
      ? String(body.published_at)
      : published
        ? new Date().toISOString()
        : null;

  const existing = await c.env.DB.prepare(`SELECT id FROM news WHERE slug = ?`).bind(slug).first();
  if (existing) slug = `${slug}-${Date.now()}`;

  const inserted = await c.env.DB.prepare(
    `INSERT INTO news (slug, title, excerpt, body, published, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     RETURNING id, slug`
  )
    .bind(slug, title, excerpt, content, published, publishedAt)
    .first<{ id: number; slug: string }>();
  return c.json({ ok: true, id: inserted?.id, slug: inserted?.slug });
});

app.put("/api/admin/news/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);
  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    published?: boolean;
    published_at?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const cur = await c.env.DB.prepare(`SELECT id FROM news WHERE id = ?`).bind(id).first();
  if (!cur) return c.json({ error: "Not found" }, 404);

  const title = body.title != null ? String(body.title).trim() : undefined;
  let slug = body.slug != null ? String(body.slug).trim() : undefined;
  if (slug) {
    const clash = await c.env.DB.prepare(`SELECT id FROM news WHERE slug = ? AND id != ?`).bind(slug, id).first();
    if (clash) return c.json({ error: "Slug already in use" }, 409);
  }

  const fields: string[] = [];
  const vals: (string | number | null)[] = [];
  if (title !== undefined) {
    fields.push("title = ?");
    vals.push(title);
  }
  if (slug !== undefined) {
    fields.push("slug = ?");
    vals.push(slug);
  }
  if (body.excerpt !== undefined) {
    fields.push("excerpt = ?");
    vals.push(String(body.excerpt));
  }
  if (body.body !== undefined) {
    fields.push("body = ?");
    vals.push(String(body.body));
  }
  if (body.published !== undefined) {
    fields.push("published = ?");
    vals.push(body.published ? 1 : 0);
  }
  if (body.published_at !== undefined) {
    fields.push("published_at = ?");
    vals.push(body.published_at ? String(body.published_at) : null);
  }
  if (fields.length === 0) return c.json({ ok: true });
  fields.push("updated_at = datetime('now')");
  vals.push(id);
  const sql = `UPDATE news SET ${fields.join(", ")} WHERE id = ?`;
  await c.env.DB.prepare(sql)
    .bind(...vals)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/admin/news/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);
  await c.env.DB.prepare(`DELETE FROM news WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// Admin positions
app.get("/api/admin/council/positions", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, sort_order FROM council_positions ORDER BY sort_order ASC, id ASC`
  ).all();
  return c.json({ items: rows.results ?? [] });
});

app.post("/api/admin/council/positions", async (c) => {
  let body: { name?: string; sort_order?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const sort = Number(body.sort_order ?? 0);
  const row = await c.env.DB.prepare(`INSERT INTO council_positions (name, sort_order) VALUES (?, ?) RETURNING id`)
    .bind(name, Number.isFinite(sort) ? sort : 0)
    .first<{ id: number }>();
  return c.json({ ok: true, id: row?.id });
});

app.put("/api/admin/council/positions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  let body: { name?: string; sort_order?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const name = body.name != null ? String(body.name).trim() : undefined;
  const sort = body.sort_order !== undefined ? Number(body.sort_order) : undefined;
  const fields: string[] = [];
  const vals: (string | number)[] = [];
  if (name !== undefined) {
    fields.push("name = ?");
    vals.push(name);
  }
  if (sort !== undefined && Number.isFinite(sort)) {
    fields.push("sort_order = ?");
    vals.push(sort);
  }
  if (fields.length === 0) return c.json({ ok: true });
  vals.push(id);
  await c.env.DB.prepare(`UPDATE council_positions SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/admin/council/positions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare(`DELETE FROM council_positions WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// Admin members
app.post("/api/admin/council/members", async (c) => {
  let body: {
    position_id?: number;
    full_name?: string;
    bio?: string;
    email?: string | null;
    phone?: string | null;
    sort_order?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const positionId = Number(body.position_id);
  const fullName = String(body.full_name ?? "").trim();
  if (!Number.isFinite(positionId) || !fullName) return c.json({ error: "position_id and full_name required" }, 400);
  const bio = String(body.bio ?? "");
  const email = body.email != null ? String(body.email) : null;
  const phone = body.phone != null ? String(body.phone) : null;
  const sort = Number(body.sort_order ?? 0);
  const row = await c.env.DB.prepare(
    `INSERT INTO council_members (position_id, full_name, bio, email, phone, sort_order) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  )
    .bind(positionId, fullName, bio, email, phone, Number.isFinite(sort) ? sort : 0)
    .first<{ id: number }>();
  return c.json({ ok: true, id: row?.id });
});

app.put("/api/admin/council/members/:id", async (c) => {
  const id = Number(c.req.param("id"));
  let body: {
    position_id?: number;
    full_name?: string;
    bio?: string;
    email?: string | null;
    phone?: string | null;
    sort_order?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const fields: string[] = [];
  const vals: (string | number | null)[] = [];
  if (body.position_id !== undefined) {
    fields.push("position_id = ?");
    vals.push(Number(body.position_id));
  }
  if (body.full_name !== undefined) {
    fields.push("full_name = ?");
    vals.push(String(body.full_name).trim());
  }
  if (body.bio !== undefined) {
    fields.push("bio = ?");
    vals.push(String(body.bio));
  }
  if (body.email !== undefined) {
    fields.push("email = ?");
    vals.push(body.email ? String(body.email) : null);
  }
  if (body.phone !== undefined) {
    fields.push("phone = ?");
    vals.push(body.phone ? String(body.phone) : null);
  }
  if (body.sort_order !== undefined) {
    fields.push("sort_order = ?");
    vals.push(Number(body.sort_order));
  }
  if (fields.length === 0) return c.json({ ok: true });
  vals.push(id);
  await c.env.DB.prepare(`UPDATE council_members SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/admin/council/members/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare(`SELECT photo_key FROM council_members WHERE id = ?`).bind(id).first<{
    photo_key: string | null;
  }>();
  if (row?.photo_key) await c.env.BUCKET.delete(row.photo_key);
  await c.env.DB.prepare(`DELETE FROM council_members WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

app.post("/api/admin/council/members/:id/photo", async (c) => {
  const id = Number(c.req.param("id"));
  const member = await c.env.DB.prepare(`SELECT id, photo_key FROM council_members WHERE id = ?`)
    .bind(id)
    .first<{ id: number; photo_key: string | null }>();
  if (!member) return c.json({ error: "Not found" }, 404);

  const form = await c.req.parseBody();
  const file = form.file;
  if (!file || typeof file === "string") return c.json({ error: "file required" }, 400);
  const f = file as File;
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `council/${id}-${crypto.randomUUID()}.${ext || "jpg"}`;
  if (member.photo_key) await c.env.BUCKET.delete(member.photo_key);
  await c.env.BUCKET.put(key, f.stream(), {
    httpMetadata: { contentType: f.type || "image/jpeg" },
  });
  await c.env.DB.prepare(`UPDATE council_members SET photo_key = ? WHERE id = ?`).bind(key, id).run();
  return c.json({ ok: true, photo_key: key });
});

// Public photo URL (redirect or proxy)
app.get("/api/council/photo/:memberId", async (c) => {
  const memberId = Number(c.req.param("memberId"));
  const row = await c.env.DB.prepare(`SELECT photo_key FROM council_members WHERE id = ?`)
    .bind(memberId)
    .first<{ photo_key: string | null }>();
  if (!row?.photo_key) return c.json({ error: "Not found" }, 404);
  const obj = await c.env.BUCKET.get(row.photo_key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

// Admin gazettes
app.get("/api/admin/gazettes", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, title, issue_number, published_at, file_name, file_size, mime, r2_key FROM gazettes ORDER BY datetime(published_at) DESC`
  ).all();
  return c.json({ items: rows.results ?? [] });
});

app.post("/api/admin/gazettes", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  const title = String(form.title ?? "").trim();
  const issueNumber = String(form.issue_number ?? "").trim();
  const publishedAt = String(form.published_at ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!file || typeof file === "string") return c.json({ error: "file and title required" }, 400);
  if (!title) return c.json({ error: "title required" }, 400);

  const f = file as File;
  const idPlaceholder = crypto.randomUUID();
  const safe = f.name.replace(/[^\w.\-]+/g, "_") || "document.pdf";
  const key = `gazettes/${idPlaceholder}-${safe}`;

  await c.env.BUCKET.put(key, f.stream(), {
    httpMetadata: { contentType: f.type || "application/pdf" },
  });

  const row = await c.env.DB.prepare(
    `INSERT INTO gazettes (title, issue_number, published_at, r2_key, file_name, file_size, mime)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  )
    .bind(title, issueNumber, publishedAt, key, f.name, f.size, f.type || "application/pdf")
    .first<{ id: number }>();
  return c.json({ ok: true, id: row?.id });
});

app.delete("/api/admin/gazettes/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare(`SELECT r2_key FROM gazettes WHERE id = ?`).bind(id).first<{ r2_key: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  await c.env.BUCKET.delete(row.r2_key);
  await c.env.DB.prepare(`DELETE FROM gazettes WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

app.post("/api/admin/instagram/refresh", async (c) => {
  const result = await refreshInstagramCache(c.env);
  return c.json(result);
});

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await refreshInstagramCache(env);
  },
};
