/**
 * Creates an admin user in local D1. Usage:
 *   node scripts/seed-admin.mjs you@example.com yourpassword
 * Then: wrangler d1 execute cmp-db --local --command "INSERT INTO admin_users ..."
 * Or pipe SQL from this script.
 *
 * Prints SQL for: INSERT INTO admin_users (email, password_record) VALUES (...);
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

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

const email = (process.argv[2] || "admin@example.com").trim().toLowerCase();
const password = process.argv[3] || "admin123";
const record = hashPassword(password);
const sql = `INSERT INTO admin_users (email, password_record) VALUES ('${email.replace(/'/g, "''")}', '${record.replace(/'/g, "''")}');`;
console.log("-- Run against your D1 database:\n");
console.log(sql);
