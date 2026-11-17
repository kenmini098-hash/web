// Explicit, bounded live acceptance check. Never run as part of the offline unit suite.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = new URL(process.env.CATALOG_CHECK_URL || "http://127.0.0.1:3105");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) throw new Error("Checks must target the local application");
const results = [];

async function check(name, route, verify) {
  const start = Date.now();
  try {
    const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(22000) });
    const data = await response.json();
    await verify(response, data);
    results.push({ name, status: "passed", http: response.status, ms: Date.now() - start,
      ids: data.items?.map(item => item.source.providerId) || (data.source ? [data.source.providerId] : undefined) });
    return data;
  } catch (error) {
    results.push({ name, status: "failed", ms: Date.now() - start, reason: error.message });
    return null;
  }
}
function list(response, data) {
  assert.equal(response.status, 200, `API returned ${response.status}: ${data.error?.code}`);
  assert.ok(Array.isArray(data.items));
  assert.equal(new Set(data.items.map(item => item.id)).size, data.items.length, "Duplicate public IDs");
  for (const item of data.items) {
    assert.ok(typeof item.title === "string" && item.title.length);
    assert.ok(["anime_tv", "anime_film"].includes(item.entityType));
    assert.equal(item.source.provider, "wikidata");
    assert.ok(!item.genres.some(genre => ["Q63952888", "Q20650540"].includes(genre.id)));
  }
}
async function main() {
  await check("health-and-security-headers", "/healthz", (response, data) => {
    assert.equal(response.status, 200); assert.equal(data.status, "ok");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.ok(response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
  });
  await check("invalid-filter-rejected", "/api/v1/anime?genreId=Q20650540", (response, data) => {
    assert.equal(response.status, 400); assert.equal(data.error.code, "INVALID_REQUEST");
  });
  for (const [qid, year] of [["Q21697406", 2016], ["Q22126305", 2013]]) {
    await check(`detail-${qid}`, `/api/v1/anime/${Buffer.from(`wikidata:${qid}`).toString("base64url")}`, (response, data) => {
      assert.equal(response.status, 200, `API returned ${response.status}: ${data.error?.code}`);
      assert.equal(data.source.providerId, qid); assert.equal(data.year, year);
    });
  }
  const first = await check("browse-first-page", "/api/v1/anime?mode=browse&limit=20", list);
  if (first?.page.nextCursor) {
    await check("browse-next-page", `/api/v1/anime?mode=browse&limit=20&cursor=${encodeURIComponent(first.page.nextCursor)}`, (response, data) => {
      list(response, data);
      assert.ok(!data.items.some(item => first.items.some(previous => previous.id === item.id)), "Repeated item across pages");
    });
  } else results.push({ name: "browse-next-page", status: "not-verified", reason: "No successful first-page cursor" });
  await check("japanese-search-tv-year", `/api/v1/anime?q=${encodeURIComponent("進撃の巨人")}&entityType=anime_tv&year=2013&limit=3`, (response, data) => {
    list(response, data);
    assert.ok(data.items.some(item => item.source.providerId === "Q22126305"), "Known TV sample absent from bounded candidates");
    assert.ok(data.items.every(item => item.year === 2013 && item.entityType === "anime_tv"));
  });
  await check("film-year-browse", "/api/v1/anime?mode=browse&entityType=anime_film&year=2016&limit=2", (response, data) => {
    list(response, data); assert.ok(data.items.length, "No film sample returned");
    assert.ok(data.items.every(item => item.year === 2016 && item.entityType === "anime_film"));
  });
  if (first?.facets.genres.length) {
    const genreId = first.facets.genres[0].id;
    await check("genre-from-current-facets", `/api/v1/anime?mode=browse&limit=20&genreId=${genreId}`, (response, data) => {
      list(response, data); assert.ok(data.items.every(item => item.genres.some(genre => genre.id === genreId)));
    });
  } else results.push({ name: "genre-from-current-facets", status: "not-verified", reason: "No successful current genre facet" });
  const report = { at: new Date().toISOString(), base: base.origin, results };
  const destination = path.resolve(__dirname, "../../docs/CATALOG_LIVE_CHECK.json");
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (results.some(result => result.status !== "passed")) process.exitCode = 1;
}
main().catch(() => { process.stderr.write("Catalog check could not finish.\n"); process.exitCode = 1; });
