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

const newsRows = [
  {
    slug: "inauguracion-espacio-comunitario-demo",
    title: "Inauguración del espacio comunitario (demo)",
    excerpt: "Acto de ejemplo con datos no reales, solo para probar el sitio.",
    body: "## Detalle de ejemplo\n\nCuerpo en **markdown** con listas:\n\n- Uno\n- Dos\n- Tres",
    published_at: "2025-01-10T15:00:00Z",
  },
  {
    slug: "sesion-ordinaria-enero-demo",
    title: "Sesión ordinaria — enero (demo)",
    excerpt: "Resumen ficticio de una sesión, para ver tarjetas y listados.",
    body: "## Orden del día (ficticio)\n\n- Punto A\n- Punto B",
    published_at: "2024-12-20T10:00:00Z",
  },
  {
    slug: "programa-juventud-demo",
    title: "Programa juventud 2025 (demo)",
    excerpt: "Borrador de ejemplo publicado para pruebas visuales.",
    body: "### Contenido de prueba\n\nTexto corto.",
    published_at: "2024-11-05T12:00:00Z",
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
