// Explicit local load check; isolated PostgreSQL schema; no outbound provider requests.
const { Pool } = require('pg');
const { randomBytes, randomUUID, createHash, createHmac } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { migrate } = require('../database');
const { createApp } = require('../sever');
const argon2 = require('argon2');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const nativeFetch = global.fetch;
global.fetch = (url, options) => {
  if (new URL(url).hostname !== '127.0.0.1') throw new Error('External requests forbidden in load check');
  return nativeFetch(url, options);
};
async function main() {
  assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL required');
  const schema = 'load_' + randomBytes(8).toString('hex');
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let db, server;
  const profiles = [];
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}`, max: 5, statement_timeout: 10000 });
    const client = await db.connect();
    try { await migrate(client); } finally { client.release(); }
    const password = randomBytes(24).toString('hex');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const users = [];
    for (let i = 0; i < 25; i++) {
      const id = randomUUID(), raw = randomBytes(32).toString('base64url'), email = `load${i}@example.invalid`;
      await db.query('INSERT INTO users(id,email_normalized,password_hash) VALUES($1,$2,$3)', [id, email, passwordHash]);
      await db.query("INSERT INTO sessions(id_hash,user_id,expires_at,authenticated_at) VALUES($1,$2,statement_timestamp()+INTERVAL '1 hour',statement_timestamp())", [createHash('sha256').update(raw).digest(), id]);
      users.push({ raw, email });
    }
    async function profile(name, count, rps, routeFor, method = 'GET') {
      const secret = randomBytes(32).toString('hex');
      const app = createApp({ db, accountSecret: secret, secureCookies: false });
      server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      const rows = [], pending = [], started = performance.now();
      let active = 0, peak = 0;
      for (let i = 0; i < count; i++) {
        if (rps) await pause(Math.max(0, started + i * 1000 / rps - performance.now()));
        const route = routeFor(i), user = users[i % users.length];
        pending.push((async () => {
          active++; peak = Math.max(peak, active); const start = performance.now();
          try {
            const response = await fetch(base + route, { method, headers: { Cookie: `anime_session=${user.raw}`,
              'X-CSRF-Token': createHmac('sha256', secret).update(`${user.raw}csrf:v1`).digest('base64url'),
              'Content-Type': 'application/json' },
              body: method === 'POST' ? JSON.stringify({ email: user.email, password }) : undefined,
              signal: AbortSignal.timeout(22000) });
            await response.arrayBuffer(); rows.push({ route, status: response.status, ms: performance.now() - start });
          } catch (error) { rows.push({ route, status: 'transport-error', ms: performance.now() - start, error: error.message }); }
          finally { active--; }
        })());
      }
      await Promise.all(pending);
      const groups = {};
      for (const route of new Set(rows.map(r => r.route))) {
        const data = rows.filter(r => r.route === route), ok = data.filter(r => r.status < 400).map(r => r.ms).sort((a,b) => a-b);
        groups[route] = { requests: data.length, statuses: data.reduce((a,r) => (a[r.status]=(a[r.status]||0)+1,a),{}),
          successfulP95Ms: ok.length ? ok[Math.ceil(ok.length * .95)-1] : null, successfulMaxMs: ok.at(-1) ?? null };
      }
      const result = { name, scheduledRps: rps, count, peakInFlight: peak, durationMs: performance.now()-started, groups };
      profiles.push(result); console.log(JSON.stringify(result));
      await new Promise(resolve => server.close(resolve)); server = null;
    }
    await profile('25 simultaneous authenticated users', 25, null, () => '/api/v1/me');
    await profile('sustained 5 RPS for 60 seconds, same IP', 300, 5, i => i % 2 ? '/api/v1/me' : '/healthz');
    await profile('burst 10 RPS for 60 seconds, same IP', 600, 10, i => i % 2 ? '/api/v1/me' : '/healthz');
    await profile('favorite deletion without provider call, 25 simultaneous users', 25, null, () => '/api/v1/me/favorites/' + Buffer.from('wikidata:Q22126305').toString('base64url'), 'DELETE');
    await profile('authentication burst, 25 simultaneous users on same IP', 25, null, () => '/api/v1/auth/login', 'POST');
    const report = { at: new Date().toISOString(), scope: 'Loopback HTTP, real PostgreSQL random schema, 25 seeded sessions, no provider access, same machine client/server', profiles };
    fs.writeFileSync(path.resolve(__dirname, '../../docs/LOCAL_LOAD_RESULTS.json'), JSON.stringify(report,null,2)+'\n');
    assert.ok(profiles.every(p => Object.values(p.groups).every(g => !g.statuses['transport-error'] && !Object.keys(g.statuses).some(s => Number(s) >= 500))));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
