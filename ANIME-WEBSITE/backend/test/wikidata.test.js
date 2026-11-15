const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError, buildSparql, listAnime } = require("../wikidata");

function binding(qid, typeId, title, year, genreId, genreLabel) {
  return {
    item: { type: "uri", value: `http://www.wikidata.org/entity/${qid}` },
    type: { type: "uri", value: `http://www.wikidata.org/entity/${typeId}` },
    title: { type: "literal", value: title, "xml:lang": "ja" },
    description: { type: "literal", value: "Japanese description", "xml:lang": "ja" },
    year: { type: "literal", value: String(year) },
    genre: { type: "uri", value: `http://www.wikidata.org/entity/${genreId}` },
    genreLabel: { type: "literal", value: genreLabel, "xml:lang": "ja" },
  };
}

test("search maps qualified Wikidata results, emits facets, and signs continuation", async () => {
  const originalFetch = global.fetch;
  let actionCalls = 0;
  let sparqlCalls = 0;
  const qid = "Q22126305";
  const genreId = "Q201658";

  global.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === "www.wikidata.org") {
      actionCalls += 1;
      if (actionCalls === 1) {
        assert.equal(url.searchParams.get("language"), "ja");
        assert.equal(url.searchParams.get("search"), "進撃の巨人");
        return Response.json({
          search: [{ id: qid }],
          continue: { continue: "-||", "search-continue": 1 },
        });
      }
      assert.equal(url.searchParams.get("search-continue"), "1");
      return Response.json({ search: [] });
    }

    sparqlCalls += 1;
    const query = new URLSearchParams(options.body).get("query");
    assert.match(query, /wd:Q63952888/);
    assert.doesNotMatch(query, /進撃の巨人/);
    return Response.json({
      results: {
        bindings: [
          binding(qid, "Q63952888", "進撃の巨人", 2013, genreId, "アクション"),
          binding(qid, "Q63952888", "進撃の巨人", 2013, "Q188163", "ファンタジー"),
        ],
      },
    });
  };

  try {
    const first = await listAnime({
      mode: "search",
      q: "進撃の巨人",
      filters: {},
      limit: 20,
      cursor: null,
    });
    assert.equal(first.items.length, 1);
    assert.equal(first.items[0].entityType, "anime_tv");
    assert.equal(first.items[0].year, 2013);
    assert.deepEqual(first.facets.genres.map(item => item.label), ["アクション", "ファンタジー"]);
    assert.ok(first.page.nextCursor);

    const next = await listAnime({
      mode: "search",
      q: "進撃の巨人",
      filters: {},
      limit: 20,
      cursor: first.page.nextCursor,
    });
    assert.deepEqual(next.items, []);
    assert.deepEqual(next.facets.genres, []);
    assert.equal(actionCalls, 2);
    assert.equal(sparqlCalls, 1);

    await assert.rejects(
      listAnime({ mode: "search", q: "別の検索", filters: {}, limit: 20, cursor: first.page.nextCursor }),
      error => error instanceof ApiError && error.status === 400,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("date unions bind each anime class and genre facets exclude media classes", () => {
  const query = buildSparql({
    candidateIds: ["Q22126305"],
    filters: { year: 2013, genreId: "Q201658" },
    after: null,
    limit: 20,
  });
  assert.match(query, /VALUES \?type \{ wd:Q63952888 \}/);
  assert.match(query, /VALUES \?type \{ wd:Q20650540 \}/);
  assert.match(query, /FILTER\(\?dateRank != wikibase:DeprecatedRank\)/);
  assert.doesNotMatch(query, /FILTER\(\?type = wd:Q(?:63952888|20650540)\)/);
  assert.match(query, /FILTER\(\?genre NOT IN \(wd:Q63952888, wd:Q20650540\)\)/);
  assert.match(query, /FILTER\(wd:Q201658 NOT IN \(wd:Q63952888, wd:Q20650540\)\)/);
});

test("malformed Wikidata response rows become provider errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => Response.json({ results: { bindings: [null] } });
  try {
    await assert.rejects(
      listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null }),
      error => error instanceof ApiError && error.status === 502 && error.code === "PROVIDER_UNAVAILABLE",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("malformed Action API search rows become provider errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => Response.json({ search: [null] });
  try {
    await assert.rejects(
      listAnime({ mode: "search", q: "anime", filters: {}, limit: 1, cursor: null }),
      error => error instanceof ApiError && error.status === 502 && error.code === "PROVIDER_UNAVAILABLE",
    );
  } finally {
    global.fetch = originalFetch;
  }
});
