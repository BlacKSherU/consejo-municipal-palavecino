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
  const row = await c.env.DB.prepare(`SELECT body, updated_at FROM site_content WHERE key = 'about'`).first<{
    body: string;
    updated_at: string;
  }>();
  if (!row) return c.json({ body: "", updated_at: null });
  return c.json({ body: row.body, updated_at: row.updated_at });
});

// --- Public: news ---
app.get("/api/news", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, slug, title, excerpt, published_at, updated_at FROM news WHERE published = 1
     ORDER BY CASE WHEN published_at IS NULL THEN 1 ELSE 0 END, datetime(published_at) DESC, id DESC`
  ).all<{
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    published_at: string | null;
    updated_at: string;
  }>();
  return c.json({ items: rows.results ?? [] });
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

// --- Public: gazettes list ---
app.get("/api/gazettes", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, title, issue_number, published_at, file_name, file_size, mime FROM gazettes ORDER BY datetime(published_at) DESC, id DESC`
  ).all<{
    id: number;
    title: string;
    issue_number: string;
    published_at: string;
    file_name: string;
    file_size: number;
    mime: string;
  }>();
  return c.json({ items: rows.results ?? [] });
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
  const row = await c.env.DB.prepare(`SELECT body, updated_at FROM site_content WHERE key = 'about'`).first<{
    body: string;
    updated_at: string;
  }>();
  return c.json({ body: row?.body ?? "", updated_at: row?.updated_at ?? null });
});

app.put("/api/admin/site/about", async (c) => {
  let body: { body?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const text = String(body.body ?? "");
  await c.env.DB.prepare(
    `INSERT INTO site_content (key, body, updated_at) VALUES ('about', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET body = excluded.body, updated_at = datetime('now')`
  )
    .bind(text)
    .run();
  return c.json({ ok: true });
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
