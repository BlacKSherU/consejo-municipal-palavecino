# Consejo Municipal Bolivariano de Palavecino

Portal institucional en **Astro** (Cloudflare Pages) y **API REST** en **Cloudflare Workers** (Hono), con **D1** (SQLite), **R2** (PDF e imágenes) e integración con **Instagram Graph API** (Meta).

## Requisitos

- Node.js 18.17+ (recomendado 20+)
- npm 9+

## Estructura del monorepo

- [`apps/web`](apps/web): sitio público y panel interno en **`/gestion-cmp`** (Astro + Tailwind, sin enlace en el menú público).
- [`apps/api`](apps/api): Worker con rutas `/api/*`.

## Desarrollo local

En dos terminales:

1. **API (Worker)** — aplica migraciones D1 locales la primera vez:

   ```bash
   cd apps/api
   npm install
   npx wrangler d1 migrations apply cmp-db --local
   npx wrangler dev
   ```

   Por defecto escucha en `http://127.0.0.1:8787`. En [`wrangler.toml`](apps/api/wrangler.toml) está definido `JWT_SECRET` para desarrollo; en producción use `npx wrangler secret put JWT_SECRET`.

   **Nota:** el CLI no queda global como `wrangler`. Desde `apps/api` usa siempre `npx wrangler …` (por ejemplo `npx wrangler deploy --dry-run`) o los scripts npm: `npm run deploy`, `npm run deploy:dry-run`, `npm run dev`.

2. **Sitio (Astro)** — el proxy envía `/api` al Worker:

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

   Abre `http://localhost:4321`. Opcional: `PUBLIC_API_URL` vacío usa el mismo origen (proxy).

### Primer usuario administrador

Genera el SQL de inserción (hash compatible con el Worker):

```bash
cd apps/api
node scripts/seed-admin.mjs tu@email.com tu_contraseña --write
```

Eso crea `seed-admin.sql` (ignorado por git). Aplícalo a la base:

```bash
# Producción (remota)
npx wrangler d1 execute cmp-db --remote --file=seed-admin.sql

# Solo local
npx wrangler d1 execute cmp-db --local --file=seed-admin.sql
```

Sin `--write`, el script solo imprime el SQL en la consola (tendrías que guardarlo tú en un `.sql`).

### Datos de demostración (ficticios)

Borra el contenido de negocio en D1 (noticias, consejo, gacetas, “Quiénes somos”, usuarios admin) e inserta ejemplos y un admin de prueba. Muestra **correo y contraseña** en consola. Úsalo solo en entornos de prueba (no en datos reales que deban conservarse).

```bash
cd apps/api
npm run seed:demo
npx wrangler d1 execute cmp-db --remote --file=seed-demo.sql
```

Por defecto: `admin@demo.cmp.test` / `DemoCmp2025!`. Personaliza con `SEED_DEMO_EMAIL` y `SEED_DEMO_PASSWORD`. Las gacetas demo apuntan a claves R2 inexistentes: se listan en el sitio; la descarga fallará hasta subir PDFs reales.

### Instagram (Meta)

1. Cuenta Instagram profesional vinculada a una página de Facebook.
2. App en [Meta for Developers](https://developers.facebook.com/) con permisos para leer medios de la cuenta de Instagram.
3. En el Worker, secretos (producción):

   ```bash
   npx wrangler secret put META_ACCESS_TOKEN
   npx wrangler secret put INSTAGRAM_USER_ID
   ```

El cron (`0 */6 * * *` en `wrangler.toml`) refresca la caché en D1; en el panel (**Gestión CMP → Instagram**) puedes forzar una actualización.

## Despliegue en Cloudflare

### Checklist: variables y secretos

| Dónde | Nombre | Tipo | Valor |
|--------|--------|------|--------|
| **Pages** (build) | `PUBLIC_API_URL` | Variable | `https://TU-WORKER.workers.dev` (sin `/` final) |
| **Worker** | `CORS_ORIGIN` | Variable | `https://TU-SITIO.pages.dev` (o tu dominio; con `https://`) |
| **Worker** | `JWT_SECRET` | Secret | Cadena larga aleatoria (`openssl rand -base64 48`) |
| **Worker** | `META_ACCESS_TOKEN` | Secret | Token Meta (Instagram Graph), si usas feed |
| **Worker** | `INSTAGRAM_USER_ID` | Secret | ID numérico de la cuenta Instagram Business |

Si `PUBLIC_API_URL` no está en Pages, el sitio intentará llamar a `/api` en el mismo dominio de Pages y fallará (no existe el Worker ahí). Si `CORS_ORIGIN` no coincide **exactamente** con el origen del navegador (`https://` + host, **sin** `/` al final; mismo host que ves en la barra de direcciones, incluido `www` si lo usas), el navegador bloqueará las peticiones (error de red en el login). Tras cambiar variables en Pages, haz un **nuevo despliegue** para que el HTML incluya `PUBLIC_API_URL`.

Desarrollo local: copia [`apps/api/.dev.vars.example`](apps/api/.dev.vars.example) a `apps/api/.dev.vars` y ajusta (no se sube a git).

### Worker (API)

1. Crea base **D1** y bucket **R2** en el dashboard o con Wrangler.
2. Copia el `database_id` real en [`apps/api/wrangler.toml`](apps/api/wrangler.toml) y el nombre del bucket.
3. En el Worker (dashboard o `wrangler secret put` / Variables): configura la tabla anterior.
4. Despliega:

   ```bash
   cd apps/api
   npm run deploy
   npx wrangler d1 migrations apply cmp-db --remote
   ```

### Pages (sitio Astro)

**Importante:** el repositorio en GitHub debe ser el **monorepo actual** (carpetas `apps/web` y `apps/api`, `package.json` en la raíz con `workspaces`, **sin** `requirements.txt` ni el antiguo build de Tailwind a `static/css`). Si el build en Cloudflare sigue ejecutando `pip install -r requirements.txt` o `tailwindcss -i ./src/tailwind/...`, estás desplegando un **commit viejo**: haz `git push` del código migrado.

Elige **una** de estas configuraciones en **Workers & Pages → tu proyecto → Settings → Builds**:

#### Opción A (recomendada): carpeta solo del front

| Campo | Valor |
|--------|--------|
| **Root directory** | `apps/web` |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `dist` |

Así solo se instalan dependencias de Astro y la salida es `apps/web/dist`.

#### Opción B: raíz del monorepo

| Campo | Valor |
|--------|--------|
| **Root directory** | `/` (vacío o `.`) |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `apps/web/dist` (**no** pongas solo `dist`: Astro escribe ahí y en la raíz no existe `dist`) |

El `package.json` de la raíz debe tener el script `build` que ejecuta el workspace `@cmp/web` (como en este repo).

En la raíz del repo hay un [`wrangler.toml`](wrangler.toml) con `pages_build_output_dir = "apps/web/dist"` para que Cloudflare Pages detecte la carpeta correcta tras el build. Si el dashboard sigue pidiendo la ruta a mano, debe coincidir con **`apps/web/dist`**.

**Error habitual:** `Output directory "dist" not found` — ocurre cuando el build corre en la raíz pero la salida de Astro está en `apps/web/dist`. Solución: **Build output directory** = `apps/web/dist`, o usa la **opción A** (root `apps/web` y salida `dist`).

**Variables de entorno (Production) en Pages:**

- **`PUBLIC_API_URL`**: URL del Worker, **sin** barra final. Obligatoria si el sitio y el API están en dominios distintos (caso habitual).

**Panel de gestión:** ruta **`/gestion-cmp`** (login en **`/gestion-cmp/login`**). No está enlazado en el sitio público. Las rutas antiguas `/admin` redirigen a `/gestion-cmp` (ver [`apps/web/public/_redirects`](apps/web/public/_redirects)).

## Licencia y créditos

Proyecto municipal. Tipografía: Plus Jakarta Sans (Google Fonts).
