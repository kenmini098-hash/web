// Initialize only the dedicated loopback trial cluster prepared in .local; never use DATABASE_URL here.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Client } = require("pg");
const { migrate } = require("../database");

async function main() {
  const local = path.resolve(__dirname, "../../.local");
  const envPath = path.join(local, "app.env");
  if (fs.existsSync(envPath)) throw new Error("Local configuration already exists");
  const adminPassword = fs.readFileSync(path.join(local, "admin.password"), "utf8").trim();
  const admin = new Client({ host: "127.0.0.1", port: 55434, user: "postgres", database: "postgres", password: adminPassword });
  const password = crypto.randomBytes(32).toString("hex");
  const secret = crypto.randomBytes(32).toString("hex");
  await admin.connect();
  try {
    // Generated hex only; PostgreSQL role DDL does not accept bind parameters for passwords.
    await admin.query(`CREATE ROLE anime_trial LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    await admin.query("CREATE DATABASE anime_trial OWNER anime_trial");
  } finally { await admin.end(); }
  const connection = `postgresql://anime_trial:${password}@127.0.0.1:55434/anime_trial`;
  const client = new Client({ connectionString: connection });
  await client.connect();
  try { await migrate(client); } finally { await client.end(); }
  fs.writeFileSync(envPath, `DATABASE_URL=${connection}\nTEST_DATABASE_URL=${connection}\nACCOUNT_SECRET=${secret}\nCURSOR_SIGNING_KEY=${crypto.randomBytes(32).toString("hex")}\nLOCAL_HTTP=1\nHOST=127.0.0.1\nPORT=3105\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write("Local application database configured and migrated; credentials saved only in ignored .local/app.env.\n");
}
main().catch(() => { process.stderr.write("Local database configuration failed; inspect the dedicated cluster without logging credentials.\n"); process.exitCode = 1; });
