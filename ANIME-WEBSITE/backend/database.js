const { Pool } = require("pg");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

function createPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
}

// Caller supplies a single checked-out client; all migration statements share its transaction.
async function migrate(client) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(18472026)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    const applied = await client.query("SELECT version FROM schema_migrations WHERE version = $1", ["001_accounts"]);
    if (!applied.rows.length) {
      const sql = await readFile(path.join(__dirname, "migrations", "001_accounts.sql"), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", ["001_accounts"]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

module.exports = { createPool, migrate };
