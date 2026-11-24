const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../sever");

test("API rejects invalid query values before provider access", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    for (const query of ["genreId=Q63952888", "genreId=Q20650540", "genreId=", "entityType=", "mode=", "cursor=", "limit=1e1", "limit=0x10", "year=0000", "q=", "limit=1&limit=2"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/anime?${query}`);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, "INVALID_REQUEST");
    }
    for (const payload of ['{', JSON.stringify({ email: 'x'.repeat(9000) })]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload,
      });
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.equal(result.error.code, 'INVALID_REQUEST');
      assert.equal('stack' in result.error, false);
    }
    const health = await fetch(`http://127.0.0.1:${server.address().port}/healthz`);
    assert.ok(health.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-powered-by'), null);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
