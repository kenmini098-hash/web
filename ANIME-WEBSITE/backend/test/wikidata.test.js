const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError, listAnime } = require("../wikidata");

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
