// Only the disposable preview server: never point this account probe at a persistent database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:3104/api/v1';
let cookie = '', token = '';
const results = [];
async function request(route, method = 'GET', body) {
  const response = await fetch(base + route, { method, headers: { Cookie: cookie, 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(22000) });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = [202, 204].includes(response.status) ? null : await response.json();
  return { response, data };
}
async function csrf() { const r = await request('/csrf'); assert.equal(r.response.status, 200); token = r.data.token; }
async function check(name, fn) {
  const start = Date.now();
  try { await fn(); results.push({ name, status: 'passed', ms: Date.now() - start }); }
  catch (error) { results.push({ name, status: 'failed', ms: Date.now() - start, reason: error.message }); }
}
(async () => {
  const email = `live-${randomBytes(8).toString('hex')}@example.invalid`, password = randomBytes(24).toString('hex');
  const id = Buffer.from('wikidata:Q22126305').toString('base64url');
  await check('temporary-account-register-login', async () => {
    await csrf(); assert.equal((await request('/auth/register', 'POST', { email, password })).response.status, 202);
    assert.equal((await request('/auth/login', 'POST', { email, password })).response.status, 200); await csrf();
  });
  await check('favorite-add-real-provider', async () => {
    const r = await request(`/me/favorites/${id}`, 'PUT');
    assert.equal(r.response.status, 201, r.data?.error?.code); assert.equal(r.data.anime.source.providerId, 'Q22126305');
  });
  await check('favorite-idempotent-real-provider', async () => {
    const r = await request(`/me/favorites/${id}`, 'PUT'); assert.equal(r.response.status, 200, r.data?.error?.code);
  });
  await check('favorite-list-real-provider', async () => {
    const r = await request('/me/favorites'); assert.equal(r.response.status, 200, r.data?.error?.code);
    assert.equal(r.data.items.length, 1); assert.equal(r.data.items[0].anime.source.providerId, 'Q22126305');
    assert.equal(r.data.items[0].anime.year, 2013);
  });
  await check('favorite-remove-and-empty', async () => {
    assert.equal((await request(`/me/favorites/${id}`, 'DELETE')).response.status, 204);
    const r = await request('/me/favorites'); assert.equal(r.response.status, 200); assert.equal(r.data.items.length, 0);
  });
  await check('temporary-account-delete', async () => {
    assert.equal((await request('/me', 'DELETE', { confirm: true })).response.status, 204);
  });
  const report = { at: new Date().toISOString(), scope: 'Disposable PGlite account; real unmocked Wikidata metadata', results };
  fs.writeFileSync(path.resolve(__dirname, `../../docs/FAVORITES_LIVE_${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); if (results.some(r => r.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
