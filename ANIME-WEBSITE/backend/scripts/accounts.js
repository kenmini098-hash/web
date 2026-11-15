const { createPool, migrate } = require("../database");
const { countInactiveAccounts, deleteInactiveAccounts } = require("../account-lifecycle");

async function main() {
  const [command, flag, ...extra] = process.argv.slice(2);
  if (extra.length || !["migrate", "cleanup"].includes(command) ||
      (flag !== undefined && (command !== "cleanup" || flag !== "--apply"))) {
    throw new Error("Usage: accounts.js migrate | cleanup [--apply]");
  }
  const pool = createPool();
  try {
    if (command === "migrate") {
      const client = await pool.connect();
      try { await migrate(client); } finally { client.release(); }
      process.stdout.write("Account schema migration complete.\n");
    } else {
      const count = flag === "--apply"
        ? await deleteInactiveAccounts(pool)
        : await countInactiveAccounts(pool);
      process.stdout.write(JSON.stringify({ mode: flag === "--apply" ? "deleted" : "preview", count }) + "\n");
    }
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  // Connection errors can contain credentials; do not print the raw exception.
  process.stderr.write("Account command failed. Check command, database access and migration configuration.\n");
  process.exitCode = 1;
});
