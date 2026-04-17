# Lineamientos — Consejo Municipal Palavecino (Cloudflare)

Stack actual: **Astro** (frontend), **Hono** en **Workers**, **D1**, **R2**. Sin Django.

## Código y estilo

- TypeScript en el Worker; componentes y páginas Astro con HTML semántico.
- Tailwind como único framework CSS; colores de marca en [`apps/web/tailwind.config.mjs`](apps/web/tailwind.config.mjs).
- Textos de interfaz en **español** salvo nombres técnicos habituales.

## Seguridad

- No commitear secretos; usar `wrangler secret` o variables del dashboard.
- Contraseñas de admin solo como hash PBKDF2 en D1; JWT firmado con `JWT_SECRET`.
- Contenido del panel es de confianza institucional; el sitio público no ejecuta scripts de terceros no revisados.

## Datos y archivos

- Metadatos relacionales en **D1**; PDFs de gacetas e imágenes de consejales en **R2**.
- Instagram: solo lectura desde Graph API; resultados cacheados en D1, no llamar a Meta en cada petición del visitante.

## Cambios en este documento

Cualquier convención nueva del equipo debe reflejarse aquí para mantener coherencia.
