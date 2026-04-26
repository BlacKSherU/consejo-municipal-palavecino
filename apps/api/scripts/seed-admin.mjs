/**
 * Genera SQL para un usuario admin (hash PBKDF2 compatible con el Worker).
 *
 * Uso:
 *   node scripts/seed-admin.mjs tu@email.com tu_contraseña
 *   node scripts/seed-admin.mjs tu@email.com tu_nueva_clave --update
 *   node scripts/seed-admin.mjs tu@email.com tu_contraseña --write
 *
 * --update  →  UPDATE (restablecer contraseña olvidada en D1; mismo email)
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

const writeFile = process.argv.includes("--write");
const isUpdate = process.argv.includes("--update");
const args = process.argv.slice(2).filter((a) => a !== "--write" && a !== "--update");

const email = (args[0] || "admin@example.com").trim().toLowerCase();
const password = args[1] || "admin123";
const record = hashPassword(password);
const q = (s) => s.replace(/'/g, "''");
const safeEmail = q(email);
const safeRecord = q(record);

const sql = isUpdate
  ? `UPDATE admin_users SET password_record = '${safeRecord}' WHERE email = '${safeEmail}';`
  : `INSERT INTO admin_users (email, password_record) VALUES ('${safeEmail}', '${safeRecord}');`;

console.log(`-- SQL generado ${isUpdate ? "(UPDATE — nueva contraseña)" : "(INSERT — usuario nuevo)"}:\n`);
console.log(sql);
console.log("");

if (writeFile) {
  const out = isUpdate ? "reset-admin-password.sql" : "seed-admin.sql";
  writeFileSync(out, sql + "\n", "utf8");
  console.log(`Escrito en ${out}`);
  console.log("  npx wrangler d1 execute cmp-db --remote --file=" + out);
  console.log("  npx wrangler d1 execute cmp-db --local --file=" + out);
} else {
  console.log("Opcional: --write genera el .sql y añade --update para restablecer contraseña (UPDATE).");
  if (!isUpdate) {
    console.log("  npx wrangler d1 execute cmp-db --remote --file=seed-admin.sql");
  } else {
    console.log("  npx wrangler d1 execute cmp-db --remote --file=reset-admin-password.sql  # tras --write con --update");
  }
}
