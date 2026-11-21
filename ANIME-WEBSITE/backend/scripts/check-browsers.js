// Explicit browser QA only: disposable SQL database and controlled provider fixtures.
// Install tooling outside production dependencies: npm install --prefix ../.local/browser-qa --no-save playwright
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { chromium, firefox, webkit } = require('../../.local/browser-qa/node_modules/playwright');
const { PGlite } = require('@electric-sql/pglite');
const { migrate } = require('../database');
const { createApp } = require('../sever');
const out = path.resolve(__dirname, '../../.local/browser-qa/results');
fs.mkdirSync(out, { recursive: true });
const id = Buffer.from('wikidata:Q22126305').toString('base64url');
const anime = { id, title: '進撃の巨人 — QA fixture', description: 'Browser test fixture only', entityType: 'anime_tv', year: 2013,
  genres: [{ id: 'Q200', label: '冒険' }], source: { provider: 'wikidata', providerId: 'Q22126305', uri: 'https://www.wikidata.org/wiki/Q22126305' } };
const nativeFetch = global.fetch;
global.fetch = async (url, options) => {
  if (new URL(url).hostname !== 'query.wikidata.org') return nativeFetch(url, options);
  return Response.json({ results: { bindings: [{
    item: { value: 'http://www.wikidata.org/entity/Q22126305' }, type: { value: 'http://www.wikidata.org/entity/Q63952888' },
    title: { value: anime.title }, description: { value: anime.description }, year: { value: '2013' },
    genre: { value: 'http://www.wikidata.org/entity/Q200' }, genreLabel: { value: '冒険' },
  }] } });
};

async function serverForTest() {
  const engine = new PGlite();
  const query = (sql, values) => values ? engine.query(sql, values) : engine.exec(sql).then(r => r.at(-1));
  let tail = Promise.resolve();
  const db = { query: async (...args) => { await tail; return query(...args); }, connect: async () => {
    const previous = tail;
    let release;
    tail = new Promise(resolve => { release = resolve; });
    await previous;
    return { query, release };
  } };
  const client = await db.connect();
  try { await migrate(client); } finally { client.release(); }
  const server = createApp({ db, secureCookies: false, accountSecret: randomBytes(32).toString('hex') }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, close: async () => {
    await new Promise(resolve => server.close(resolve)); await engine.close();
  } };
}

async function run(name, engine, launch) {
  const result = { name, checks: [], errors: [], screenshots: [] };
  let browser, server, page;
  async function check(label, fn) { await fn(); result.checks.push(label); }
  async function layout(label) {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: overflow at ${width}`);
      if (width <= 560 && await page.locator('.header-note').count()) {
        assert.ok(await page.evaluate(() => {
          const note = document.querySelector('.header-note').getBoundingClientRect();
          return [...document.querySelectorAll('.site-header a')].every(link => link.getBoundingClientRect().bottom <= note.top);
        }), 'Mobile header note must have its own row');
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    const file = `${name}-${label}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    result.screenshots.push(file);
  }
  try {
    browser = await engine.launch({ headless: true, ...launch });
    result.version = browser.version();
    server = await serverForTest();
    const context = await browser.newContext({ acceptDownloads: true });
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => result.errors.push(error.message));
    let scenario = 'normal', failDetail = false;
    const requests = [];
    await page.route('**/api/v1/anime**', async route => {
      const url = new URL(route.request().url()); requests.push(url);
      if (url.pathname.endsWith('/anime')) {
        if (scenario === 'timeout') return route.fulfill({ status: 504, json: { error: { code: 'PROVIDER_TIMEOUT' } } });
        const more = url.searchParams.has('cursor');
        return route.fulfill({ json: { items: scenario === 'empty' ? [] : [{ ...anime, ...(more ? { id: 'second', title: 'Second fixture' } : {}) }],
          facets: { genres: anime.genres }, page: { nextCursor: more || scenario === 'empty' ? null : 'test-cursor' } } });
      }
      return route.fulfill(failDetail ? { status: 502, json: { error: { code: 'PROVIDER_UNAVAILABLE' } } } : { json: anime });
    });
    await check('catalog render and five viewport widths', async () => {
      await page.goto(server.base); await page.locator('.card-title').waitFor(); await layout('catalog');
    });
    await check('keyboard dialog, focus return, detail retry and five viewport widths', async () => {
      const card = page.locator('.card-title').first(); await card.focus(); await page.keyboard.press('Enter');
      await page.locator('#save-favorite').waitFor(); await layout('detail');
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#detail-dialog').evaluate(el => el.open), false);
      assert.equal(await card.evaluate(el => el === document.activeElement), true);
      failDetail = true; await card.click(); await page.locator('#retry-detail').waitFor();
      failDetail = false; await page.locator('#retry-detail').click(); await page.locator('#save-favorite').waitFor();
      await page.locator('#close-detail').click();
    });
    await check('Japanese search, combined filters, submitted-criteria pagination and clear', async () => {
      await page.locator('#query').fill('進撃の巨人'); await page.locator('#query').press('Enter');
      await page.waitForURL('**/?q=*');
      await page.locator('#entity-type').selectOption('anime_tv'); await page.locator('#genre').selectOption('Q200');
      await page.locator('#year').fill('2013'); await page.locator('#query').press('Enter');
      await page.waitForURL('**/*year=2013');
      await page.locator('#query').fill('unsent edit'); await page.locator('#load-more').click();
      await page.waitForFunction(() => document.querySelectorAll('.anime-card').length === 2);
      const sent = requests.findLast(url => url.searchParams.has('cursor'));
      assert.equal(sent.searchParams.get('q'), '進撃の巨人'); assert.equal(sent.searchParams.get('year'), '2013');
      assert.equal(sent.searchParams.get('genreId'), 'Q200'); assert.equal(sent.searchParams.get('entityType'), 'anime_tv');
      await page.locator('#clear-filters').click(); await page.waitForURL(url => !url.searchParams.has('year'));
    });
    await check('empty result, provider timeout and user retry', async () => {
      scenario = 'empty'; await page.locator('#query').press('Enter'); await page.locator('.empty-state').waitFor();
      scenario = 'timeout'; await page.locator('#query').press('Enter'); await page.locator('#retry').waitFor();
      assert.match(await page.locator('#status').innerText(), /phản hồi quá lâu/);
      scenario = 'normal'; await page.locator('#retry').click(); await page.locator('.card-title').waitFor();
    });
    await check('anonymous favorite redirects to sign-in', async () => {
      await page.locator('.card-title').click(); await page.locator('#save-favorite').click();
      await page.waitForURL('**/account.html?next=*');
    });
    const email = `${name}@example.invalid`, password = randomBytes(18).toString('hex'), newPassword = randomBytes(18).toString('hex');
    await check('native form validation, register, keyboard login and session reload', async () => {
      await page.goto(server.base + '/account.html'); await page.locator('#login-form').waitFor(); await layout('login');
      await page.locator('#email').fill('invalid'); await page.locator('#password').fill('short');
      assert.equal(await page.locator('#login-form').evaluate(el => el.checkValidity()), false);
      await page.locator('#email').fill(email); await page.locator('#password').fill(password);
      await page.locator('button[value=register]').click();
      await page.waitForFunction(() => document.querySelector('#password').value === '');
      await page.locator('#password').fill(password); await page.locator('#password').press('Enter');
      await page.locator('#signed-in').waitFor(); await page.reload(); await page.locator('#signed-in').waitFor();
      assert.equal(await page.locator('#current-email').innerText(), email); await layout('account');
    });
    await check('save favorite, list favorite, export download, remove favorite', async () => {
      await page.goto(server.base); await page.locator('.card-title').click(); await page.locator('#save-favorite').click();
      await page.waitForFunction(() => document.querySelector('#favorite-feedback').textContent.includes('Đã lưu'));
      await page.goto(server.base + '/account.html'); await page.locator('#favorites li').waitFor();
      const downloadEvent = page.waitForEvent('download'); await page.locator('a[download]').click();
      const download = await downloadEvent; const file = await download.path();
      const exported = JSON.parse(fs.readFileSync(file, 'utf8')); assert.ok(JSON.stringify(exported).includes(email));
      assert.ok(!/password_hash|csrf_token|token_hash/.test(JSON.stringify(exported)));
      await page.locator('#favorites button').click(); await page.waitForFunction(() => !document.querySelector('#favorites li'));
    });
    await check('password change, logout and login with new password', async () => {
      await page.locator('[name=currentPassword]').fill(password); await page.locator('[name=newPassword]').fill(newPassword);
      await page.locator('#password-form button').click();
      await page.waitForFunction(() => document.querySelector('#account-status').textContent.includes('Đã đổi'));
      await page.locator('#logout').click(); await page.locator('#login-form').waitFor();
      await page.locator('#email').fill(email); await page.locator('#password').fill(newPassword); await page.locator('#password').press('Enter');
      await page.locator('#signed-in').waitFor();
    });
    await check('explicit reauthentication, confirmation and self deletion', async () => {
      assert.equal(await page.locator('#delete-form').evaluate(el => el.checkValidity()), false);
      await page.locator('#reauth-form input').fill(newPassword); await page.locator('#reauth-form button').click();
      await page.waitForFunction(() => document.querySelector('#account-status').textContent.includes('Đã xác thực'));
      await page.locator('#confirm-delete').check(); await page.locator('#delete-form button').click();
      await page.locator('#login-form').waitFor();
      assert.match(await page.locator('#account-status').innerText(), /Đã xóa tài khoản/);
    });
    if (name !== 'firefox') await check('emulated mobile touch: card, dialog close and login form', async () => {
      const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const touchPage = await mobile.newPage();
      touchPage.on('pageerror', error => result.errors.push(error.message));
      await touchPage.route('**/api/v1/anime**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/anime')
        ? { items: [anime], facets: { genres: anime.genres }, page: { nextCursor: null } } : anime }));
      await touchPage.goto(server.base); await touchPage.locator('.card-title').tap();
      await touchPage.locator('#save-favorite').waitFor(); await touchPage.locator('#close-detail').tap();
      assert.equal(await touchPage.locator('#detail-dialog').evaluate(el => el.open), false);
      await touchPage.goto(server.base + '/account.html'); await touchPage.locator('#login-form').waitFor();
      await touchPage.locator('#email').tap(); await touchPage.keyboard.type('touch@example.invalid');
      assert.equal(await touchPage.locator('#email').inputValue(), 'touch@example.invalid');
      await mobile.close();
    });
    assert.deepEqual(result.errors, []); result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.failure = error.message;
    if (page) await page.screenshot({ path: path.join(out, `${name}-failure.png`), fullPage: true }).catch(() => {});
  } finally { if (browser) await browser.close(); if (server) await server.close(); }
  console.log(JSON.stringify(result)); return result;
}
(async () => {
  const results = [];
  for (const [name, engine, launch] of [['chrome', chromium, { channel: 'chrome' }], ['edge', chromium, { channel: 'msedge' }], ['firefox', firefox, {}], ['webkit', webkit, {}]]) results.push(await run(name, engine, launch));
  const report = { at: new Date().toISOString(), scope: 'Headless Windows browsers; disposable PGlite; controlled provider fixtures; WebKit is not Safari/iOS certification', results };
  fs.writeFileSync(path.resolve(__dirname, '../../docs/BROWSER_QA_RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  if (results.some(r => r.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
