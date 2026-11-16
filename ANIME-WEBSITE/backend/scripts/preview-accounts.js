// Disposable browser-test server, not a production database or deployment mode.
const { PGlite } = require("@electric-sql/pglite");
const { migrate } = require("../database");
const { createApp } = require("../sever");

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Test preview is not available in production");
  const engine = new PGlite();
  const db = { query: (sql, values) => values ? engine.query(sql, values) : engine.exec(sql).then(r => r.at(-1)) };
  // Serialize transactions on the single embedded connection used only by this test preview.
  let transactionTail = Promise.resolve();
  const query = db.query;
  db.query = async (...args) => { await transactionTail; return query(...args); };
  db.connect = async () => {
    const previous = transactionTail;
    let release;
    transactionTail = new Promise(resolve => { release = resolve; });
    await previous;
    return { query, release };
  };
  const client = await db.connect();
  try { await migrate(client); } finally { client.release(); }
  const app = createApp({ db, secureCookies: false });
  const server = app.listen(3104, "127.0.0.1", () => process.stdout.write("Disposable account test preview: http://127.0.0.1:3104/account.html\nNo seeded accounts; data disappears on shutdown.\n"));
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close(() => engine.close()));
}
main().catch(() => { process.stderr.write("Test preview failed.\n"); process.exitCode = 1; });
