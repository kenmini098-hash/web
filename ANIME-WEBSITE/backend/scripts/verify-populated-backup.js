// Local-only populated recovery rehearsal. Writes only to databases created by this run.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const argon2 = require('argon2');
const { migrate } = require('../database');
const { deleteInactiveAccounts, deleteOwnAccount } = require('../account-lifecycle');
const local = path.resolve(__dirname, '../../.local');
const bin = path.join(local, 'postgres/pgsql/bin');
const tables = ['schema_migrations', 'users', 'sessions', 'favorites', 'verification_tokens', 'password_reset_tokens'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function snapshot(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const data = {};
    for (const table of tables) {
      const r = await client.query(`SELECT row_to_json(t)::text AS value FROM ${table} t ORDER BY row_to_json(t)::text`);
      data[table] = { count: r.rows.length, digest: sha(JSON.stringify(r.rows)) };
    }
    await client.query('COMMIT'); return data;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(url.hostname === '127.0.0.1' && url.port === '55434' && url.pathname === '/anime_trial' && url.username === 'anime_trial', 'Dedicated local cluster required');
  const config = { host: '127.0.0.1', port: 55434, user: 'anime_trial', password: decodeURIComponent(url.password) };
  const admin = new Client({ ...config, user: 'postgres', database: 'postgres', password: fs.readFileSync(path.join(local, 'admin.password'), 'utf8').trim() });
  const original = new Client({ ...config, database: 'anime_trial' });
  const suffix = crypto.randomBytes(8).toString('hex');
  const sourceName = `anime_fixture_${suffix}`, targetName = `anime_restore_${suffix}`;
  const created = new Set(), clients = [];
  const started = performance.now(), checks = [];
  await admin.connect(); await original.connect();
  try {
    const originalBefore = await snapshot(original);
    for (const name of [sourceName, targetName]) {
      assert.match(name, /^anime_(fixture|restore)_[a-f0-9]{16}$/);
      await admin.query(`CREATE DATABASE ${name} OWNER anime_trial`); created.add(name);
    }
    const source = new Client({ ...config, database: sourceName }); await source.connect(); clients.push(source);
    await migrate(source);
    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const password = crypto.randomBytes(24).toString('hex');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const sessionHash = crypto.randomBytes(32);
    for (let i = 0; i < ids.length; i++) {
      await source.query('INSERT INTO users(id,email_normalized,password_hash) VALUES($1,$2,$3)', [ids[i], `restore${i}@example.invalid`, passwordHash]);
      await source.query("INSERT INTO sessions(id_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,statement_timestamp()+INTERVAL '1 hour',statement_timestamp())", [i === 0 ? sessionHash : crypto.randomBytes(32), ids[i]]);
      for (const qid of ['Q22126305', 'Q21697406']) await source.query("INSERT INTO favorites(user_id,provider,provider_id) VALUES($1,'wikidata',$2)", [ids[i], qid]);
    }
    await source.query("UPDATE users SET last_active_at=statement_timestamp()-INTERVAL '169 hours' WHERE id=$1", [ids[1]]);
    await source.query("UPDATE sessions SET created_at=statement_timestamp()-INTERVAL '2 hours',expires_at=statement_timestamp()-INTERVAL '1 hour' WHERE user_id=$1", [ids[2]]);
    const before = await snapshot(source);
    const options = { env: { ...process.env, PGPASSWORD: config.password }, windowsHide: true, maxBuffer: 64 * 1024 * 1024 };
    const backupStarted = performance.now();
    const dump = execFileSync(path.join(bin, 'pg_dump.exe'), ['-h','127.0.0.1','-p','55434','-U','anime_trial','-Fc','--no-owner','--no-acl',sourceName], options);
    const keyFile = path.join(local, 'backup.key');
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32), { flag: 'wx', mode: 0o600 });
    const key = fs.readFileSync(keyFile); assert.equal(key.length, 32);
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
    const blob = Buffer.concat([Buffer.from('ATLAS1'), iv, cipher.getAuthTag(), encrypted]);
    const backupDir = path.join(local, 'backups'); fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `populated-${suffix}.aes`);
    fs.writeFileSync(file, blob, { flag: 'wx', mode: 0o600 });
    const backupMs = performance.now() - backupStarted;
    function decrypt(value, suppliedKey = key) {
      assert.equal(value.subarray(0,6).toString(), 'ATLAS1');
      const decipher = crypto.createDecipheriv('aes-256-gcm', suppliedKey, value.subarray(6,18));
      decipher.setAuthTag(value.subarray(18,34));
      return Buffer.concat([decipher.update(value.subarray(34)), decipher.final()]);
    }
    const stored = fs.readFileSync(file), tampered = Buffer.from(stored); tampered[tampered.length-1] ^= 1;
    assert.throws(() => decrypt(tampered)); assert.throws(() => decrypt(stored, crypto.randomBytes(32)));
    checks.push('tampered ciphertext and wrong key rejected');
    const recoveryStarted = performance.now(), decrypted = decrypt(stored);
    assert.equal(sha(decrypted), sha(dump)); checks.push('decrypted archive matches original bytes');
    execFileSync(path.join(bin, 'pg_restore.exe'), ['-h','127.0.0.1','-p','55434','-U','anime_trial','-d',targetName,'--exit-on-error','--no-owner','--no-acl'], { ...options, input: decrypted });
    const restored = new Client({ ...config, database: targetName }); await restored.connect(); clients.push(restored);
    assert.deepEqual(await snapshot(restored), before); checks.push('all six table snapshots match including hashes, timestamps and ownership');
    const recovered = await restored.query('SELECT password_hash FROM users WHERE id=$1', [ids[0]]);
    assert.ok(await argon2.verify(recovered.rows[0].password_hash, password)); checks.push('restored Argon2id password verifies');
    const recoveryMs = performance.now() - recoveryStarted;
    assert.equal(await deleteInactiveAccounts(restored), 1);
    assert.equal((await restored.query('SELECT * FROM favorites WHERE user_id=$1', [ids[1]])).rows.length, 0);
    assert.equal((await restored.query('SELECT * FROM sessions WHERE user_id=$1', [ids[1]])).rows.length, 0);
    checks.push('post-restore inactivity cleanup cascades only overdue account');
    await restored.query('DELETE FROM sessions WHERE expires_at<=statement_timestamp()');
    assert.equal((await restored.query('SELECT * FROM sessions WHERE user_id=$1', [ids[2]])).rows.length, 0);
    assert.equal(await deleteOwnAccount(restored, sessionHash, true), true);
    assert.equal((await restored.query('SELECT * FROM favorites WHERE user_id=$1', [ids[0]])).rows.length, 0);
    assert.equal((await restored.query('SELECT * FROM users WHERE id=$1', [ids[2]])).rows.length, 1);
    checks.push('expired sessions removed and manual deletion cascades without deleting other user');
    assert.deepEqual(await snapshot(source), before); checks.push('populated fixture source unchanged');
    assert.deepEqual(await snapshot(original), originalBefore); checks.push('personal application database snapshot unchanged');
    const report = { at: new Date().toISOString(), status: 'passed', scope: 'Dedicated local PostgreSQL populated fixture only',
      fixtureCounts: Object.fromEntries(Object.entries(before).map(([k,v]) => [k,v.count])), checks,
      archiveBytes: dump.length, encryptedBytes: stored.length, backupMs, recoveryThroughIntegrityCheckMs: recoveryMs,
      totalMs: performance.now()-started, backupFile: path.basename(file),
      limits: 'Small fixture; no nightly/offsite schedule, outage RPO/RTO or production HTTP/session certification' };
    fs.writeFileSync(path.resolve(__dirname, '../../docs/POPULATED_RESTORE_RESULTS.json'), JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {
    for (const client of clients.reverse()) await client.end();
    await original.end();
    // Only exact randomly named databases successfully created by this invocation are removed.
    for (const name of [...created].reverse()) await admin.query(`DROP DATABASE ${name}`);
    await admin.end();
  }
}
main().catch(() => { console.error('Populated rehearsal failed; credentials and raw subprocess output suppressed.'); process.exitCode = 1; });
