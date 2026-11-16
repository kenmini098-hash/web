// Local restore rehearsal only: never targets the application database for restore/drop.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { Client } = require("pg");

async function main() {
  const source = new URL(process.env.DATABASE_URL);
  if (source.hostname !== "127.0.0.1" || source.port !== "55434" || source.pathname !== "/anime_trial" || source.username !== "anime_trial") {
    throw new Error("Only the dedicated local trial database is supported");
  }
  const local = path.resolve(__dirname, "../../.local");
  const bin = path.join(local, "postgres/pgsql/bin");
  const backupDir = path.join(local, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const keyFile = path.join(local, "backup.key");
  if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32), { flag: "wx", mode: 0o600 });
  const key = fs.readFileSync(keyFile);
  if (key.length !== 32) throw new Error("Invalid backup key");
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(source.password) };
  const options = { env, windowsHide: true, maxBuffer: 64 * 1024 * 1024 };
  // shortcut: bounded in-memory local backup; use streamed managed backups for databases above 64 MiB.
  const dump = execFileSync(path.join(bin, "pg_dump.exe"), ["-h", "127.0.0.1", "-p", "55434", "-U", "anime_trial", "-Fc", "--no-owner", "--no-acl", "anime_trial"], options);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(dump), cipher.final()]);
  const file = path.join(backupDir, `trial-${Date.now()}.aes`);
  fs.writeFileSync(file, Buffer.concat([Buffer.from("ATLAS1"), iv, cipher.getAuthTag(), ciphertext]), { flag: "wx", mode: 0o600 });
  const stored = fs.readFileSync(file);
  if (stored.subarray(0, 6).toString() !== "ATLAS1") throw new Error("Invalid backup header");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, stored.subarray(6, 18));
  decipher.setAuthTag(stored.subarray(18, 34));
  const restoredDump = Buffer.concat([decipher.update(stored.subarray(34)), decipher.final()]);
  const admin = new Client({ host: "127.0.0.1", port: 55434, database: "postgres", user: "postgres", password: fs.readFileSync(path.join(local, "admin.password"), "utf8").trim() });
  const restoreName = `anime_restore_${crypto.randomBytes(8).toString("hex")}`;
  await admin.connect();
  let created = false;
  try {
    await admin.query(`CREATE DATABASE ${restoreName} OWNER anime_trial`);
    created = true;
    execFileSync(path.join(bin, "pg_restore.exe"), ["-h", "127.0.0.1", "-p", "55434", "-U", "anime_trial", "-d", restoreName, "--exit-on-error", "--no-owner", "--no-acl"], { ...options, input: restoredDump });
    const restored = new Client({ host: "127.0.0.1", port: 55434, user: "anime_trial", password: decodeURIComponent(source.password), database: restoreName });
    await restored.connect();
    try {
      const version = await restored.query("SELECT version FROM schema_migrations");
      if (!version.rows.some(row => row.version === "001_accounts")) throw new Error("Missing migration");
      await restored.query("SELECT count(*) FROM users");
      await restored.query("SELECT count(*) FROM favorites");
    } finally { await restored.end(); }
    process.stdout.write("Encrypted local backup restored successfully into an isolated database; source database unchanged.\n");
  } finally {
    if (created) await admin.query(`DROP DATABASE ${restoreName}`);
    await admin.end();
  }
}
main().catch(() => { process.stderr.write("Local backup rehearsal failed; do not log credentials or raw subprocess output.\n"); process.exitCode = 1; });
