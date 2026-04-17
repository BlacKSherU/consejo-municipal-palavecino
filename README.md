# Consejo Municipal Bolivariano de Palavecino

Portal institucional en **Astro** (Cloudflare Pages) y **API REST** en **Cloudflare Workers** (Hono), con **D1** (SQLite), **R2** (PDF e imágenes) e integración con **Instagram Graph API** (Meta).

## Requisitos

- Node.js 18.17+ (recomendado 20+)
- npm 9+

## Estructura del monorepo

- [`apps/web`](apps/web): sitio público y panel `/admin` (Astro + Tailwind).
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
node scripts/seed-admin.mjs tu@email.com tu_contraseña
```

Ejecuta la sentencia `INSERT` impresa contra la base local:

```bash
npx wrangler d1 execute cmp-db --local --command "INSERT INTO admin_users ..."
```

(Asegúrate de escapar comillas según tu shell o usa un archivo `.sql`.)

### Instagram (Meta)

1. Cuenta Instagram profesional vinculada a una página de Facebook.
2. App en [Meta for Developers](https://developers.facebook.com/) con permisos para leer medios de la cuenta de Instagram.
3. En el Worker, secretos (producción):

   ```bash
   npx wrangler secret put META_ACCESS_TOKEN
   npx wrangler secret put INSTAGRAM_USER_ID
   ```

El cron (`0 */6 * * *` en `wrangler.toml`) refresca la caché en D1; el panel **Admin → Instagram** permite forzar una actualización.

## Despliegue en Cloudflare

### Worker (API)

1. Crea base **D1** y bucket **R2** en el dashboard o con Wrangler.
2. Copia el `database_id` real en [`apps/api/wrangler.toml`](apps/api/wrangler.toml) y el nombre del bucket.
3. Configura secretos: `JWT_SECRET`, `META_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`.
4. Variable opcional `CORS_ORIGIN`: lista separada por comas con el origen del sitio Pages (por ejemplo `https://cmp.pages.dev`).
5. Despliega:

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
| **Build output directory** | `apps/web/dist` |

El `package.json` de la raíz debe tener el script `build` que ejecuta el workspace `@cmp/web` (como en este repo).

**Variables de entorno (Production):**

- **`PUBLIC_API_URL`**: URL del Worker, **sin** barra final, p. ej. `https://cmp-api.xxx.workers.dev`. Vacía solo si el HTML y `/api` sirven desde el **mismo origen** (mismo dominio).

**CORS:** en el Worker, define `CORS_ORIGIN` con la URL del sitio Pages (p. ej. `https://tu-proyecto.pages.dev`) para que el navegador pueda llamar al API desde otro dominio.

## Licencia y créditos

Proyecto municipal. Tipografía: Plus Jakarta Sans (Google Fonts).
