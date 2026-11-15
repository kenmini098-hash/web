const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { migrate } = require("../database");
const { recordActivity, deleteOwnAccount, countInactiveAccounts, deleteInactiveAccounts } = require("../account-lifecycle");

test("account lifecycle executes against isolated PostgreSQL SQL engine", async t => {
  const engine = new PGlite();
  const db = {
    query: (sql, values) => values ? engine.query(sql, values) : engine.exec(sql).then(results => results.at(-1)),
  };
  async function account(age = "0 hours", reauth = "0 minutes") {
    const id = randomUUID();
    const hash = randomBytes(32);
    await db.query(`INSERT INTO users(id,email_normalized,password_hash,email_verified_at,last_active_at)
      VALUES ($1,$2,'test-only-hash',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP - $3::interval)`, [id, `${id}@example.invalid`, age]);
    await db.query(`INSERT INTO sessions(id_hash,user_id,expires_at,authenticated_at)
      VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '1 day',CURRENT_TIMESTAMP - $3::interval)`, [hash, id, reauth]);
    await db.query("INSERT INTO favorites(user_id,provider,provider_id) VALUES ($1,'wikidata','Q22126305')", [id]);
    for (const table of ["verification_tokens", "password_reset_tokens"]) {
      await db.query(`INSERT INTO ${table}(token_hash,user_id,expires_at) VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '1 hour')`, [randomBytes(32), id]);
    }
    return { id, hash };
  }
  try {
    await migrate(db);
    await migrate(db);
    assert.equal((await db.query("SELECT * FROM schema_migrations")).rows.length, 1);

    await t.test("cleanup removes seven-day inactive accounts and all dependent rows only", async () => {
      const old = await account("168 hours");
      const active = await account("167 hours");
      assert.equal(await countInactiveAccounts(db), 1);
      assert.equal(await recordActivity(db, old.hash), false);
      assert.equal(await recordActivity(db, active.hash), true);
      assert.equal(await deleteInactiveAccounts(db), 1);
      assert.equal(await deleteInactiveAccounts(db), 0);
      for (const table of ["sessions", "favorites", "verification_tokens", "password_reset_tokens"]) {
        assert.equal((await db.query(`SELECT * FROM ${table} WHERE user_id=$1`, [old.id])).rows.length, 0);
        assert.equal((await db.query(`SELECT * FROM ${table} WHERE user_id=$1`, [active.id])).rows.length, 1);
      }
    });

    await t.test("manual deletion requires confirmation and fresh reauthentication for that session", async () => {
      const stale = await account("0 hours", "6 minutes");
      const fresh = await account();
      assert.equal(await deleteOwnAccount(db, fresh.hash, false), false);
      assert.equal(await deleteOwnAccount(db, fresh.hash, "true"), false);
      assert.equal(await deleteOwnAccount(db, randomBytes(32), true), false);
      assert.equal(await deleteOwnAccount(db, stale.hash, true), false);
      assert.equal(await deleteOwnAccount(db, fresh.hash, true), true);
      assert.equal((await db.query("SELECT * FROM users WHERE id=$1", [stale.id])).rows.length, 1);
      for (const table of ["sessions", "favorites", "verification_tokens", "password_reset_tokens"]) {
        assert.equal((await db.query(`SELECT * FROM ${table} WHERE user_id=$1`, [fresh.id])).rows.length, 0);
      }
    });

    await t.test("personal trial allows unverified emails but rejects expired and anonymous sessions", async () => {
      const unverified = await account();
      await db.query("UPDATE users SET email_verified_at=NULL WHERE id=$1", [unverified.id]);
      assert.equal(await recordActivity(db, unverified.hash), true);
      assert.equal((await db.query("SELECT email_verified_at FROM users WHERE id=$1", [unverified.id])).rows[0].email_verified_at, null);
      assert.equal(await deleteOwnAccount(db, unverified.hash, true), true);
      const expired = await account();
      await db.query(`UPDATE sessions SET created_at=CURRENT_TIMESTAMP - INTERVAL '2 hours',
        expires_at=CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE id_hash=$1`, [expired.hash]);
      assert.equal(await recordActivity(db, expired.hash), false);
      assert.equal(await deleteOwnAccount(db, expired.hash, true), false);
      const anonymous = randomBytes(32);
      await db.query("INSERT INTO sessions(id_hash,expires_at) VALUES ($1,CURRENT_TIMESTAMP + INTERVAL '1 hour')", [anonymous]);
      assert.equal(await recordActivity(db, anonymous), false);
    });
  } finally {
    await engine.close();
  }
});
