import type { Env } from "./env";

type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

type GraphListResponse = {
  data?: IgMediaItem[];
  paging?: { next?: string };
  error?: { message: string };
};

export async function refreshInstagramCache(env: Env): Promise<{ ok: boolean; error?: string }> {
  const token = env.META_ACCESS_TOKEN;
  const igId = env.INSTAGRAM_USER_ID;
  if (!token || !igId) {
    await env.DB.prepare(
      `UPDATE instagram_cache SET payload = ?, error = ?, fetched_at = ? WHERE id = 1`
    )
      .bind(JSON.stringify([]), "Missing META_ACCESS_TOKEN or INSTAGRAM_USER_ID", new Date().toISOString())
      .run();
    return { ok: false, error: "Instagram not configured" };
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${igId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp"
  );
  url.searchParams.set("limit", "25");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const json = (await res.json()) as GraphListResponse;
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    await env.DB.prepare(
      `UPDATE instagram_cache SET error = ?, fetched_at = ? WHERE id = 1`
    )
      .bind(msg, new Date().toISOString())
      .run();
    return { ok: false, error: msg };
  }

  const items = json.data ?? [];
  const payload = JSON.stringify({
    items,
    fetchedAt: new Date().toISOString(),
  });
  await env.DB.prepare(
    `UPDATE instagram_cache SET payload = ?, error = NULL, fetched_at = ? WHERE id = 1`
  )
    .bind(payload, new Date().toISOString())
    .run();
  return { ok: true };
}
