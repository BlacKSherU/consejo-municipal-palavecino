/**
 * Genera el INSERT para un usuario admin (hash PBKDF2 compatible con el Worker).
 *
 * Uso:
 *   node scripts/seed-admin.mjs tu@email.com tu_contraseña
 *   node scripts/seed-admin.mjs tu@email.com tu_contraseña --write
 *
 * Con --write crea seed-admin.sql en el directorio actual (listo para wrangler).
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

const args = process.argv.slice(2).filter((a) => a !== "--write");
const writeFile = process.argv.includes("--write");

const email = (args[0] || "admin@example.com").trim().toLowerCase();
const password = args[1] || "admin123";
const record = hashPassword(password);
const sql = `INSERT INTO admin_users (email, password_record) VALUES ('${email.replace(/'/g, "''")}', '${record.replace(/'/g, "''")}');`;

console.log("-- SQL generado:\n");
console.log(sql);
console.log("");

if (writeFile) {
  const out = "seed-admin.sql";
  writeFileSync(out, sql + "\n", "utf8");
  console.log(`Escrito en ${out}`);
  console.log("  npx wrangler d1 execute cmp-db --remote --file=seed-admin.sql");
  console.log("  npx wrangler d1 execute cmp-db --local --file=seed-admin.sql");
} else {
  console.log('Opcional: añade --write para crear seed-admin.sql y ejecutar con:');
  console.log("  npx wrangler d1 execute cmp-db --remote --file=seed-admin.sql");
}
