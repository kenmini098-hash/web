const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { PGlite } = require("@electric-sql/pglite");
const { migrate } = require("../database");
const { createAccounts } = require("../accounts");
const { ApiError } = require("../wikidata");
const { Pool } = require("pg");
const { randomBytes } = require("node:crypto");

test("account HTTP flows, session security and favorite isolation", async t => {
  const schema = `test_${randomBytes(8).toString("hex")}`;
  const realDatabase = Boolean(process.env.TEST_DATABASE_URL);
  const engine = realDatabase ? new Pool({ connectionString: process.env.TEST_DATABASE_URL }) : new PGlite();
  let db;
  if (realDatabase) {
    await engine.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  } else {
    db = { query: (sql, values) => values ? engine.query(sql, values) : engine.exec(sql).then(r => r.at(-1)) };
    db.connect = async () => ({ query: db.query, release() {} });
  }
  const migrationClient = await db.connect();
  try { await migrate(migrationClient); } finally { migrationClient.release(); }
  let providerDown = false;
  const app = express();
  app.use(express.json());
  app.use("/api/v1", createAccounts({ db, secret: "test-only-secret".repeat(3), secure: false, authLimit: 100,
    resolveAnime: async id => {
      if (providerDown) throw new ApiError(504, "PROVIDER_TIMEOUT", "Timed out");
      if (id === Buffer.from("wikidata:Q999999999").toString("base64url")) return null;
      return { id, title: "Test fixture only", genres: [], source: { provider: "wikidata" } };
    } }));
  app.use((error, req, res, next) => res.status(error.status || 503).json({ error: { code: error.code || "SERVICE_UNAVAILABLE" } }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const root = `http://127.0.0.1:${server.address().port}/api/v1`;
  function browser() {
    return { cookie: "", token: "", async request(path, method = "GET", data, csrf = true) {
      const response = await fetch(root + path, { method, headers: { Cookie: this.cookie, ...(csrf ? { "X-CSRF-Token": this.token } : {}), "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
      const cookie = response.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      return response;
    }, async csrf() { const response = await this.request("/csrf"); assert.equal(response.status, 200); this.token = (await response.json()).token; } };
  }
  const alice = browser(), bob = browser();
  const password = "test-password-12345";
  const id = Buffer.from("wikidata:Q22126305").toString("base64url");
  try {
    await t.test("secure cookie attributes and authentication rate limits are enforced", async () => {
      const secureApp = express();
      secureApp.use(createAccounts({ db, secret: "secure-cookie-test".repeat(3), authLimit: 1 }));
      secureApp.use((error, req, res, next) => {
        if (error.retryAfter) res.set("Retry-After", error.retryAfter);
        res.status(error.status || 503).end();
      });
      const listener = secureApp.listen(0, "127.0.0.1");
      await new Promise(resolve => listener.once("listening", resolve));
      const base = `http://127.0.0.1:${listener.address().port}`;
      try {
        const response = await fetch(base + "/csrf");
        const cookie = response.headers.get("set-cookie");
        assert.match(cookie, /^__Host-anime_session=/);
        for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) assert.ok(cookie.includes(attribute));
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await fetch(base + "/auth/login", { method: "POST" })).status, 403);
        const limited = await fetch(base + "/auth/login", { method: "POST" });
        assert.equal(limited.status, 429);
        assert.ok(Number(limited.headers.get("retry-after")) > 0);
      } finally { await new Promise(resolve => listener.close(resolve)); }
    });
    await t.test("registration needs CSRF; login rotates anonymous session; CSRF refresh preserves identity", async () => {
      await alice.csrf();
      assert.equal((await alice.request("/auth/register", "POST", { email: "alice@example.invalid", password }, false)).status, 403);
      assert.equal((await alice.request("/auth/register", "POST", { email: "alice@example.invalid", password })).status, 202);
      const row = (await db.query("SELECT password_hash,email_verified_at FROM users")).rows[0];
      assert.match(row.password_hash, /^\$argon2id\$/);
      assert.equal(row.email_verified_at, null);
      const anonymousCookie = alice.cookie;
      assert.equal((await alice.request("/auth/login", "POST", { email: "ALICE@example.invalid", password })).status, 200);
      assert.notEqual(alice.cookie, anonymousCookie);
      assert.equal((await alice.request("/auth/logout", "POST")).status, 403);
      await alice.csrf();
      const stableCookie = alice.cookie, stableToken = alice.token;
      await alice.csrf();
      assert.equal(alice.cookie, stableCookie);
      assert.equal(alice.token, stableToken);
      assert.equal((await (await alice.request("/me")).json()).user.email, "alice@example.invalid");
      await bob.csrf();
      await bob.request("/auth/register", "POST", { email: "bob@example.invalid", password });
      await bob.request("/auth/login", "POST", { email: "bob@example.invalid", password });
      await bob.csrf();
      assert.equal((await alice.request("/auth/login", "POST", { email: "bob@example.invalid", password })).status, 401);
    });
    await t.test("favorites are idempotent, scoped and cursors cannot cross accounts", async () => {
      assert.equal((await alice.request(`/me/favorites/${id}`, "PUT")).status, 201);
      assert.equal((await alice.request(`/me/favorites/${id}`, "PUT")).status, 200);
      const other = Buffer.from("wikidata:Q21697406").toString("base64url");
      await alice.request(`/me/favorites/${other}`, "PUT");
      assert.equal((await bob.request(`/me/favorites/${id}`, "DELETE")).status, 204);
      assert.equal((await (await bob.request("/me/favorites")).json()).items.length, 0);
      const first = await (await alice.request("/me/favorites?limit=1")).json();
      assert.equal(first.items.length, 1);
      assert.ok(first.page.nextCursor);
      const path = "/me/favorites?limit=1&cursor=" + encodeURIComponent(first.page.nextCursor);
      assert.equal((await bob.request(path)).status, 400);
      const second = await (await alice.request(path)).json();
      assert.equal(second.items.length, 1);
      assert.notEqual(second.items[0].animeId, first.items[0].animeId);
      providerDown = true;
      assert.equal((await alice.request("/me/favorites")).status, 504);
      providerDown = false;
      assert.equal((await alice.request(`/me/favorites/${Buffer.from("wikidata:Q999999999").toString("base64url")}`, "PUT")).status, 404);
    });
    await t.test("password change revokes other sessions and export omits credentials", async () => {
      const another = browser(); await another.csrf();
      await another.request("/auth/login", "POST", { email: "alice@example.invalid", password });
      await another.csrf();
      const exported = await (await alice.request("/me/export")).text();
      assert.ok(!exported.includes("password_hash") && !exported.includes("token") && !exported.includes("id_hash"));
      assert.equal((await alice.request("/auth/password", "POST", { currentPassword: password, newPassword: "replacement-password-123" })).status, 204);
      await alice.csrf();
      assert.equal((await another.request("/me")).status, 401);
      assert.equal((await alice.request("/me")).status, 200);
    });
    await t.test("stale deletion requires explicit reauthentication and never auto-replays", async () => {
      await db.query("UPDATE sessions SET authenticated_at=statement_timestamp()-INTERVAL '6 minutes' WHERE user_id=(SELECT id FROM users WHERE email_normalized=$1)", ["alice@example.invalid"]);
      assert.equal((await alice.request("/me", "DELETE", { confirm: true })).status, 403);
      assert.equal((await alice.request("/auth/login", "POST", { email: "alice@example.invalid", password: "replacement-password-123" })).status, 200);
      await alice.csrf();
      assert.equal((await alice.request("/me", "DELETE", { confirm: false })).status, 400);
      assert.equal((await alice.request("/me", "DELETE", { confirm: true })).status, 204);
      assert.equal((await alice.request("/me")).status, 401);
      assert.equal((await db.query("SELECT * FROM favorites")).rows.length, 0);
      assert.equal((await bob.request("/me")).status, 200);
      assert.equal((await bob.request("/auth/logout", "POST")).status, 204);
      assert.equal((await bob.request("/me")).status, 401);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (realDatabase) {
      await db.end();
      await engine.query(`DROP SCHEMA ${schema} CASCADE`);
      await engine.end();
    } else await engine.close();
  }
});
