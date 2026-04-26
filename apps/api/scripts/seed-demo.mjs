/**
 * Genera SQL de demostración: borra datos de negocio y reinserta contenido ficticio
 * (noticias, consejo, gacetas, “Quiénes somos”, admin). Úsalo en entornos de prueba.
 *
 * Credenciales por defecto (cambialas con variables de entorno):
 *   SEED_DEMO_EMAIL    (default: admin@demo.cmp.test)
 *   SEED_DEMO_PASSWORD (default: DemoCmp2025!)
 *
 * Uso:
 *   node scripts/seed-demo.mjs           # solo imprime SQL y credenciales
 *   node scripts/seed-demo.mjs --write  # escribe seed-demo.sql
 *   npx wrangler d1 execute cmp-db --local  --file=seed-demo.sql
 *   npx wrangler d1 execute cmp-db --remote --file=seed-demo.sql
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN = 32;

function toB64(buf) {
  return Buffer.from(buf).toString("base64");
}

function hashPassword(plain) {
  const salt = randomBytes(SALT_LEN);
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, "sha256");
  return `pbkdf2:${ITERATIONS}:${toB64(salt)}:${toB64(hash)}`;
}

function q(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const writeFile = process.argv.includes("--write");

const email = (process.env.SEED_DEMO_EMAIL || "admin@demo.cmp.test").trim().toLowerCase();
const password = process.env.SEED_DEMO_PASSWORD || "DemoCmp2025!";

const passwordRecord = hashPassword(password);

const aboutBody = [
  "# Consejo Municipal (demo)",
  "",
  "Este **texto es de demostración** para ajustar estilos. Palavecino — contenido 100% ficticio.",
  "",
  "## Misión (ejemplo)",
  "Servir a la comunidad con transparencia.",
].join("\n");

/** Cuerpos extensos en Markdown (ficticio, 100% demostración) — encajan con `marked` en noticias. */
const bodyManualMarkdown = [
  "> **Aviso:** noticia y datos son **ficticios**; solo sirven para mostrar títulos, listas, código, tablas y el resto de estilos.",
  "",
  "En el listado, este bloque de cita con borde pone en contexto el lector. Puedes añadir **citas anidadas:**",
  "",
  "> Cita de primer nivel",
  ">",
  "> > Cita interior (más indentación). *Itálico* y **negrita** y un [vínculo a ejemplo (externo)](https://example.com).",
  "",
  "El cuerpo admite títulos jerárquicos (evita abusar del H1; aquí vamos a mostrarlos igual en demo):",
  "",
  "# Demostración H1",
  "## Título de sección (H2)",
  "### Subsección (H3)",
  "#### Detalle (H4)",
  "",
  "Texto normal, con *énfasis* y __énfase alterna__, **negrita**, ***negrita e itálica a la vez***, y ~~tachado~~ si quieres marcar un borrador o corrección (todo ficticio en este artículo).",
  "",
  "Separador (raya) entre bloques temáticos:",
  "",
  "---",
  "",
  "### Listas, anidadas y tareas",
  "",
  "Lista con viñetas e ítems de segundo nivel (cuatro espacios o un tab, según editor):",
  "",
  "- Punto principal (Palavecino — demo).",
  "  - Sub-viñeta: barrios de ejemplo: *Río*, *Loma*.",
  "  - Otra sub: presupuestos, fiscalización, *etc.* (no real).",
  "- Números o normas: puede enlazarse a [Wikipedia: Markdown](https://es.wikipedia.org/wiki/Markdown) solo como ejemplo.",
  "- Orden del día (ficticio) en números:",
  "",
  "1. Apertura y constancia de quórum.",
  "2. Intervención: vocerías y mesa.",
  "3. **Lectura** (simulada) y votación (simulada).",
  "   1. Subapartado: comisiones.",
  "   2. Otra: correspondencia (demo).",
  "",
  "Tareas (checkboxes) — útil para *checklist* de redacción:",
  "",
  "- [x] Título, entradilla y fecha revisados (demo).",
  "- [x] Imágenes o enlaces verificados en entorno de prueba.",
  "- [ ] Criterios de publicación oficiales (ficticio; pendiente en guión).",
  "",
  "Imagen con texto alternativo (foto de archivo genérica, URL externa):",
  "",
  "![Asamblea simulada — demostración del render](https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=600&fit=crop)",
  "",
  "Tabla: datos inventados, solo maquetado:",
  "",
  "| Eje (demo) | Unidad o meta | Indicador (ficticio) |",
  "|------------|---------------|----------------------|",
  "| Participación | ~120 personas (ejemplo) | Presencial + seguimiento web (demo) |",
  "| Transparencia | 8 informes (ejemplo) | *Publicación* bajo 48 h (simulado) |",
  "| Infraestructura | 3 obras (ejemplo) | `OK` *pendiente* validación (demo) |",
  "",
  "Código en línea: asigna `const slug = 'mi-noticia'`, o referencias `site_content`, `D1` — solo ejemplos de nombres.",
  "",
  "Bloque de código (JSON de ejemplo, sin datos reales):",
  "",
  "```json",
  "{",
  '  "municipio": "Palavecino (demo)",',
  '  "sede": { "direccion": "…", "zona": "Ficticio" },',
  '  "puntos_orden_dia": [1, 2, 3],',
  '  "publicado_solo": "laboratorios o demos"',
  "}",
  "```",
  "",
  "Otro bloque, por ejemplo *tipo shell* (ficticio):",
  "",
  "```bash",
  "# No ejecute en producción: ejemplo de comentario",
  "npx wrangler d1 execute cmp-db --local --file=./ejemplo.sql",
  "```",
  "",
  "Cierre: si copias desde Word, revisa títulos y listas. Este párrafo final cierra el artículo de *demostración* completa con **todos** los trucos habituales de Markdown en noticias.",
  "",
].join("\n");

const bodyTallerPresupuestos = [
  "## Contexto (ficticio)",
  "El **Taller de presupuestos participativos 2026** descrito aquí *no* ha ocurrido: es un segundo artículo largo para probar otra ficha, tarjeta y tipografía con contenido rico en Markdown.",
  "",
  "Resumen de mesas (inventado): se debatieron prioridades en *salud*, *deporte* y *espacios comunitarios*, con criterio de *equidad territorial* (solo como texto de maqueta).",
  "",
  "### Puntos alcanzados (simulado)",
  "",
  "- Apertura e **instalación** de mesas.",
  "- Registro *simulado* de propuestas vecinales.",
  "- Síntesis no oficial (demo) en tabla:",
  "",
  "| Código (ejemplo) | Propuesta (demo) | Puntuación aprox. |",
  "|------------------|------------------|-------------------|",
  "| *P-01* | Adecuación de *parque* de ejemplo | **Alta** |",
  "| *P-02* | *Biblioteca* itinerante (demo) | *Media* |",
  "| *P-03* | ~~Descartada~~ (guión) | *Baja* (fict.) |",
  "",
  "Más información en *web externa* de terceros (solo enlace de prueba): [página de ejemplo](https://example.org/taller-demo).",
  "",
  "Cita:",
  "",
  "> “La participación requiere espacios claros, aun en escenarios *simulados* de diseño de interfaz — fragmento *inventado* en Palavecino (demostración).”",
  "",
  "`Fin del cuerpo` (demo) — y una lista numerada mínima:",
  "",
  "1. Criterio 1: claridad (demo).",
  "2. Criterio 2: *accesibilidad* del lenguaje.",
  "3. Criterio 3: **sincronía** con la identidad gráfica del sitio (prueba).",
  "",
  "---",
  "",
  "![Vecinos de ejemplo (Unsplash) — ficción](https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=600&fit=crop&auto=format)",
  "",
  "Pie conceptual: *imágenes externas* deben tener permiso o licencia adecuada; aquí se usa *solo* en **entorno de demostración**.",
  "",
].join("\n");

const bodyNotaBreve = [
  "### Nota breve (fict.)",
  "Texto corto para probar otra **tarjeta** en el listado: *énfasis*, [enlace](https://example.com) y un ítem: `npm run build`.",
  "",
  "- Aviso ~~obsoleto~~ reemplazado (demo).",
  "- Tarea: [x] *listo* en ficción, [ ] *revisar* al maquetar en producción (demo).",
  "",
  "> Cita mínima de cierre. **Palavecino (demo, 100% ficción).**",
  "",
].join("\n");

const newsRows = [
  {
    slug: "demo-guia-completa-markdown-noticias",
    title: "Guía visual (demo): Markdown en noticias con todos los estilos",
    excerpt:
      "Artículo 100% ficticio para probar títulos, cita, listas, tareas, tablas, código, imágenes y mucho más en el detalle de noticias — datos no reales.",
    body: bodyManualMarkdown,
    published_at: "2026-04-10T10:00:00Z",
  },
  {
    slug: "demo-taller-presupuestos-2026-ficticio",
    title: "Taller de presupuestos 2026 — balance simulado (ficticio)",
    excerpt:
      "Segundo texto largo de demostración: otra ficha, tablas, imágenes y cita, sin ningún dato real del municipio.",
    body: bodyTallerPresupuestos,
    published_at: "2026-04-01T14:30:00Z",
  },
  {
    slug: "demo-nota-breve-markdown",
    title: "Aviso de plazo (ficticio) y checklist en noticia corta",
    excerpt: "Tercer ejemplo compacto: tarjetas del listado y estilos básicos a la vez; contenido de laboratorio, no oficial.",
    body: bodyNotaBreve,
    published_at: "2026-03-18T09:00:00Z",
  },
];

const parts = [];

parts.push(
  `-- Población de demostración (ficticia). Borra: admin, noticias, consejo, gacetas, "about"; actualiza Instagram cache a vacío.
-- NO ejecutar sobre una base con datos reales que quieras conservar.
-- (Sin BEGIN/COMMIT: wrangler d1 execute --remote no admite transacciones SQL en archivo.)

DELETE FROM council_members;
DELETE FROM council_positions;
DELETE FROM gazettes;
DELETE FROM news;
DELETE FROM admin_users;
DELETE FROM site_content;

INSERT INTO site_content (key, body) VALUES ('about', ${q(aboutBody)});

INSERT INTO admin_users (email, password_record) VALUES (${q(email)}, ${q(passwordRecord)});
`
);

for (const n of newsRows) {
  parts.push(
    `INSERT INTO news (slug, title, excerpt, body, published, published_at) VALUES (${q(
      n.slug
    )}, ${q(n.title)}, ${q(n.excerpt)}, ${q(n.body)}, 1, ${q(n.published_at)});`
  );
}

parts.push(`
INSERT INTO council_positions (id, name, sort_order) VALUES
  (1, 'Presidencia', 0),
  (2, 'Vocalía ejecutiva', 1),
  (3, 'Comisión de gobierno (demo)', 2);

INSERT INTO council_members (position_id, full_name, bio, photo_key, email, phone, sort_order) VALUES
  (1, 'María Elena Ficticia', 'Biografía de ejemplo. Rol presidencia.', NULL, 'presidencia@demo.cmp', '+58 200-0000000', 0),
  (2, 'José Demo Sánchez', 'Vocalía: texto ficticio para maquetar.', NULL, 'vocal@demo.cmp', NULL, 0),
  (2, 'Ana Montes (demo)', 'Segunda vocal por orden de prueba.', NULL, NULL, NULL, 1),
  (3, 'Carlos R. Placeholder', 'Miembro de comisión, datos no reales.', NULL, NULL, NULL, 0);

INSERT INTO gazettes (title, issue_number, published_at, r2_key, file_name, file_size, mime) VALUES
  (
    'Gaceta Oficial — Enero 2025 (demo)',
    'GO-2025-01',
    '2025-01-15T00:00:00Z',
    'gacetas/demo/gaceta-enero-2025.pdf',
    'Gaceta-Enero-2025-demo.pdf',
    0,
    'application/pdf'
  ),
  (
    'Gaceta Oficial — Diciembre 2024 (demo)',
    'GO-2024-12',
    '2024-12-10T00:00:00Z',
    'gacetas/demo/gaceta-diciembre-2024.pdf',
    'Gaceta-Dic-2024-demo.pdf',
    0,
    'application/pdf'
  );

UPDATE instagram_cache SET payload = '[]', error = NULL, fetched_at = datetime('now') WHERE id = 1;
`);

const sql = parts.join("\n");

console.log("══════════════════════════════════════════════════════════════");
console.log("  Datos de acceso (panel /gestion-cmp/login) — demostración");
console.log("  Correo:   ", email);
console.log("  Contraseña:", password);
console.log("══════════════════════════════════════════════════════════════");
console.log("");

if (writeFile) {
  const out = "seed-demo.sql";
  writeFileSync(out, sql + "\n", "utf8");
  console.log(`Escrito: ${out}`);
  console.log("");
  console.log("Aplicar:");
  console.log("  npx wrangler d1 execute cmp-db --local  --file=seed-demo.sql");
  console.log("  npx wrangler d1 execute cmp-db --remote --file=seed-demo.sql");
} else {
  console.log("SQL generado (usa --write para guardar en seed-demo.sql):");
  console.log("");
  console.log(sql);
}
