import { apiFetch } from "../lib/api";

type Img = { url: string; alt: string };

function addImageRow(url = "", alt = "") {
  const host = document.getElementById("img-rows");
  if (!host) return;

  const wrap = document.createElement("div");
  wrap.className =
    "flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-start dark:border-slate-700";

  const left = document.createElement("div");
  left.className = "min-w-0 flex-1 space-y-2";

  const labUrl = document.createElement("label");
  labUrl.className = "block text-xs text-slate-500 dark:text-slate-400";
  labUrl.textContent = "URL (https://…) ";
  const inpUrl = document.createElement("input");
  inpUrl.type = "url";
  inpUrl.className =
    "img-url mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950";
  inpUrl.placeholder = "https://ejemplo.com/foto.jpg";
  inpUrl.value = url;
  labUrl.appendChild(inpUrl);
  left.appendChild(labUrl);

  const labAlt = document.createElement("label");
  labAlt.className = "block text-xs text-slate-500 dark:text-slate-400";
  labAlt.textContent = "Descripción / alt ";
  const inpAlt = document.createElement("input");
  inpAlt.type = "text";
  inpAlt.className =
    "img-alt mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950";
  inpAlt.placeholder = "Breve descripción";
  inpAlt.value = alt;
  labAlt.appendChild(inpAlt);
  left.appendChild(labAlt);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "img-del shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40";
  del.textContent = "Quitar";
  del.addEventListener("click", () => wrap.remove());

  wrap.appendChild(left);
  wrap.appendChild(del);
  host.appendChild(wrap);
}

function collectImages(): Img[] {
  const host = document.getElementById("img-rows");
  if (!host) return [];
  const out: Img[] = [];
  for (const row of host.querySelectorAll(":scope > div")) {
    const url = (row.querySelector(".img-url") as HTMLInputElement)?.value?.trim() ?? "";
    const alt = (row.querySelector(".img-alt") as HTMLInputElement)?.value?.trim() ?? "";
    if (!url) continue;
    out.push({ url, alt });
  }
  return out;
}

async function load() {
  const res = await apiFetch("/api/admin/site/about");
  if (!res.ok) return;
  const data = (await res.json()) as {
    body?: string;
    mission?: string;
    vision?: string;
    images?: Img[];
  };
  const ta = document.getElementById("about-body") as HTMLTextAreaElement;
  const m = document.getElementById("about-mission") as HTMLTextAreaElement;
  const v = document.getElementById("about-vision") as HTMLTextAreaElement;
  if (ta) ta.value = data.body || "";
  if (m) m.value = data.mission || "";
  if (v) v.value = data.vision || "";
  const host = document.getElementById("img-rows");
  if (host) {
    host.innerHTML = "";
    const imgs = Array.isArray(data.images) ? data.images : [];
    if (imgs.length === 0) addImageRow("", "");
    else for (const im of imgs) addImageRow(im.url, im.alt);
  }
}

export function initAdminAboutForm(): void {
  document.getElementById("img-add")?.addEventListener("click", () => addImageRow("", ""));

  document.getElementById("about-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ta = document.getElementById("about-body") as HTMLTextAreaElement;
    const m = document.getElementById("about-mission") as HTMLTextAreaElement;
    const v = document.getElementById("about-vision") as HTMLTextAreaElement;
    const msg = document.getElementById("about-msg");
    if (!ta || !m || !v) return;
    const res = await apiFetch("/api/admin/site/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: ta.value,
        mission: m.value,
        vision: v.value,
        images: collectImages(),
      }),
    });
    if (msg) msg.textContent = res.ok ? "Guardado." : "Error al guardar.";
  });

  void load();
}
