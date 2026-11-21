const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError, buildSparql, listAnime, getAnimeDetail, REQUEST_TIMEOUT_MS } = require("../wikidata");

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

function detailDateBinding(qid, typeId, title, dateValue, precision, genreId = "Q201658", genreLabel = "映画ジャンル") {
  const row = binding(qid, typeId, title, 0, genreId, genreLabel);
  delete row.year;
  if (dateValue !== null) {
    row.dateValue = { type: "literal", value: dateValue };
    row.precision = { type: "literal", value: String(precision) };
  }
  return row;
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
        assert.equal(url.searchParams.get("uselang"), "ja");
        assert.equal(url.searchParams.get("search"), "進撃の巨人");
        return Response.json({
          search: [{ id: qid }],
          "search-continue": 1,
        });
      }
      assert.equal(url.searchParams.get("continue"), "1");
      assert.equal(url.searchParams.has("search-continue"), false);
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
    assert.equal("providerId" in first.items[0], false);
    assert.equal(first.items[0].source.providerId, qid);
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
  assert.doesNotMatch(query, /SELECT DISTINCT/);

  const filmOnly = buildSparql({
    candidateIds: null,
    filters: { entityType: "anime_film", year: 2016 },
    after: null,
    limit: 2,
    idsOnly: true,
  });
  assert.match(filmOnly, /wdt:P31 wd:Q20650540/);
  assert.match(filmOnly, /p:P577/);
  assert.match(filmOnly, /pq:P291 wd:Q17/);
  assert.doesNotMatch(filmOnly, /p:P580/);
  assert.doesNotMatch(filmOnly, /UNION/);

  const continued = buildSparql({ candidateIds: null, filters: {}, after: "Q22126305", limit: 2 });
  assert.match(continued, /FILTER\(STR\(\?item\) > STR\(wd:Q22126305\)\)/);
  assert.match(continued, /ORDER BY \?item/);
  assert.doesNotMatch(continued, /FILTER\(\?item >/);
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

test("provider failures preserve rate limits and distinguish timeouts from invalid JSON", async () => {
  const originalFetch = global.fetch;
  const cases = [
    [() => new Response("", { status: 429, headers: { "Retry-After": "30" } }), 429, "RATE_LIMITED", "30"],
    [() => { throw new DOMException("Timed out", "TimeoutError"); }, 504, "PROVIDER_TIMEOUT", null],
    [() => new Response("not json"), 502, "PROVIDER_UNAVAILABLE", null],
    [() => new Response("x".repeat(2_000_001)), 502, "PROVIDER_UNAVAILABLE", null],
    [() => Response.json(null), 502, "PROVIDER_UNAVAILABLE", null],
    [() => new Response("", { status: 503 }), 502, "PROVIDER_UNAVAILABLE", null],
  ];
  try {
    for (const [respond, status, code, retryAfter] of cases) {
      global.fetch = async () => respond();
      await assert.rejects(
        listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null }),
        error => error instanceof ApiError && error.status === status && error.code === code && error.retryAfter === retryAfter,
      );
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test("safe read queries retry at most once with jitter on transient upstream failures", async () => {
  const originalFetch = global.fetch;
  try {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      if (calls === 1) return new Response("", { status: 503 });
      return Response.json({ results: { bindings: [] } });
    };
    const recoveredFrom503 = await listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null });
    assert.deepEqual(recoveredFrom503.items, []);
    assert.equal(calls, 2);

    calls = 0;
    global.fetch = async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return Response.json({ search: [] });
    };
    const recoveredFromNetwork = await listAnime({ mode: "search", q: "test", filters: {}, limit: 1, cursor: null });
    assert.deepEqual(recoveredFromNetwork.items, []);
    assert.equal(calls, 2);

    calls = 0;
    global.fetch = async () => {
      calls += 1;
      return new Response("", { status: 502 });
    };
    await assert.rejects(
      listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null }),
      error => error instanceof ApiError && error.status === 502 && error.code === "PROVIDER_UNAVAILABLE",
    );
    assert.equal(calls, 2);

    calls = 0;
    global.fetch = async () => {
      calls += 1;
      return new Response("", { status: 429, headers: { "Retry-After": "12" } });
    };
    await assert.rejects(
      listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null }),
      error => error instanceof ApiError && error.status === 429 && error.retryAfter === "12",
    );
    assert.equal(calls, 1);

    calls = 0;
    global.fetch = async () => {
      calls += 1;
      return new Response("", { status: 503 });
    };
    await assert.rejects(
      getAnimeDetail(Buffer.from("wikidata:Q100").toString("base64url"), Date.now() + 100),
      error => error instanceof ApiError && error.status === 502 && error.code === "PROVIDER_UNAVAILABLE",
    );
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("provider concurrency is bounded and capacity is released", async () => {
  const originalFetch = global.fetch;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  global.fetch = async () => { await gate; return Response.json({ results: { bindings: [] } }); };
  const query = () => listAnime({ mode: "browse", q: null, filters: {}, limit: 1, cursor: null });
  const first = query(), second = query();
  try {
    await assert.rejects(query(), error => error.status === 503 && error.retryAfter === "1");
    release();
    await Promise.all([first, second]);
    assert.deepEqual((await query()).items, []);
  } finally { release(); await Promise.allSettled([first, second]); global.fetch = originalFetch; }
});

test("browse qualifies before enrichment, deduplicates and advances its signed cursor", async () => {
  const originalFetch = global.fetch;
  const queries = [];
  global.fetch = async (url, options) => {
    const query = new URLSearchParams(options.body).get("query");
    queries.push(query);
    const continued = query.includes("STR(wd:Q101)");
    const ids = continued ? ["Q102"] : ["Q100", "Q101", "Q102"];
    if (query.includes("SELECT DISTINCT ?item")) {
      assert.ok(query.includes('LANG(?title) = "ja"'));
      assert.ok(!query.includes("?yearCandidate"));
      return Response.json({ results: { bindings: ids.map(id => ({ item: { value: `http://www.wikidata.org/entity/${id}` } })) } });
    }
    if (!query.includes("HAVING")) assert.ok(query.includes("VALUES ?item"));
    const rows = ids.map(id => binding(id, "Q63952888", id, 2013, id === "Q102" ? "Q300" : "Q200", "Test genre"));
    const unexpected = binding("Q999", "Q63952888", "Unexpected", 2013, "Q999", "Ignored");
    return Response.json({ results: { bindings: [...rows, rows[0], ...(query.includes("HAVING") ? [] : [unexpected])] } });
  };
  try {
    const first = await listAnime({ mode: "browse", q: null, filters: {}, limit: 2, cursor: null });
    assert.deepEqual(first.items.map(item => item.source.providerId), ["Q100", "Q101"]);
    assert.deepEqual(first.facets.genres.map(genre => genre.id), ["Q200"]);
    const next = await listAnime({ mode: "browse", q: null, filters: {}, limit: 2, cursor: first.page.nextCursor });
    assert.deepEqual(next.items.map(item => item.source.providerId), ["Q102"]);
    assert.equal(next.page.nextCursor, null);
    assert.deepEqual(next.facets.genres, []);
    assert.equal(queries.length, 4);
    queries.length = 0;
    await listAnime({ mode: "browse", q: null, filters: { year: 2013 }, limit: 2, cursor: null });
    assert.equal(queries.length, 2);
    assert.ok(queries[0].includes("SELECT DISTINCT ?item"));
    assert.ok(queries[0].includes("2013-01-01T00:00:00Z"));
    assert.ok(queries[1].includes("HAVING (MIN(?yearCandidate) = 2013)"));
  } finally { global.fetch = originalFetch; }
});

test("filtered browse validates genreId via lightweight facet check and persists context across pages", async () => {
  const originalFetch = global.fetch;
  const queries = [];
  global.fetch = async (url, options) => {
    const query = new URLSearchParams(options.body).get("query");
    queries.push(query);
    if (query.includes("SELECT DISTINCT ?genre ?genreLabel")) {
      assert.doesNotMatch(query, /schema:description/);
      assert.doesNotMatch(query, /P580/);
      return Response.json({
        results: {
          bindings: [
            {
              genre: { type: "uri", value: "http://www.wikidata.org/entity/Q200" },
              genreLabel: { type: "literal", value: "アクション", "xml:lang": "ja" },
            },
          ],
        },
      });
    }
    if (query.includes("SELECT DISTINCT ?item")) {
      const ids = query.includes("STR(wd:Q101)") ? ["Q102"] : query.includes("wdt:P136 wd:Q200") ? ["Q100", "Q101", "Q102"] : ["Q100", "Q101"];
      return Response.json({
        results: { bindings: ids.map(id => ({ item: { value: `http://www.wikidata.org/entity/${id}` } })) },
      });
    }
    const pageIds = query.includes("wd:Q102") && !query.includes("wd:Q100") ? ["Q102"] : ["Q100", "Q101", "Q102"];
    return Response.json({
      results: {
        bindings: pageIds.map(id => binding(id, "Q63952888", `作品 ${id}`, 2013, "Q200", "アクション")),
      },
    });
  };
  try {
    await assert.rejects(
      listAnime({ mode: "browse", q: null, filters: { genreId: "Q999" }, limit: 2, cursor: null }),
      error => error instanceof ApiError && error.status === 400 && error.code === "INVALID_REQUEST",
    );
    assert.equal(queries.length, 2);

    queries.length = 0;
    const first = await listAnime({ mode: "browse", q: null, filters: { genreId: "Q200" }, limit: 2, cursor: null });
    assert.deepEqual(first.items.map(item => item.source.providerId), ["Q100", "Q101"]);
    assert.deepEqual(first.facets.genres, []);
    assert.ok(first.page.nextCursor);
    assert.equal(queries.length, 4);

    await assert.rejects(
      listAnime({ mode: "browse", q: null, filters: { genreId: "Q200", year: 2013 }, limit: 2, cursor: first.page.nextCursor }),
      error => error instanceof ApiError && error.status === 400,
    );

    const next = await listAnime({ mode: "browse", q: null, filters: { genreId: "Q200" }, limit: 2, cursor: first.page.nextCursor });
    assert.deepEqual(next.items.map(item => item.source.providerId), ["Q102"]);
    assert.equal(next.page.nextCursor, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("filtered search enforces AND semantics, facet bounds, and deduplicates candidates", async () => {
  const originalFetch = global.fetch;
  let sparqlCalls = 0;
  global.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "www.wikidata.org") {
      if (url.searchParams.get("search") === "空") {
        return Response.json({ search: [] });
      }
      return Response.json({
        search: [{ id: "Q22126305" }, { id: "Q22126305" }, { id: "Q21697406" }],
      });
    }
    sparqlCalls += 1;
    return Response.json({
      results: {
        bindings: [
          binding("Q22126305", "Q63952888", "進撃の巨人", 2013, "Q200", "アクション"),
          binding("Q21697406", "Q20650540", "君の名は。", 2016, "Q200", "アクション"),
        ],
      },
    });
  };
  try {
    const filtered = await listAnime({
      mode: "search",
      q: "進撃の巨人",
      filters: { entityType: "anime_film", genreId: "Q200", year: 2016 },
      limit: 20,
      cursor: null,
    });
    assert.equal(sparqlCalls, 1);
    assert.deepEqual(filtered.items.map(item => item.source.providerId), ["Q21697406"]);
    assert.deepEqual(filtered.facets.genres, []);

    await assert.rejects(
      listAnime({ mode: "search", q: "進撃の巨人", filters: { genreId: "Q999" }, limit: 20, cursor: null }),
      error => error instanceof ApiError && error.status === 400 && error.code === "INVALID_REQUEST",
    );
    await assert.rejects(
      listAnime({ mode: "search", q: "空", filters: { genreId: "Q200" }, limit: 20, cursor: null }),
      error => error instanceof ApiError && error.status === 400 && error.code === "INVALID_REQUEST",
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("normalization excludes conflicting types, media genres, fallback QIDs, and caps facets at 30", async () => {
  const originalFetch = global.fetch;
  const rows = [];
  for (let i = 1; i <= 35; i++) {
    rows.push(binding("Q100", "Q63952888", "有効な作品", 2020, `Q${1000 + i}`, `ジャンル${String(i).padStart(2, "0")}`));
  }
  rows.push(binding("Q100", "Q63952888", "有効な作品", 2020, "Q20650540", "アニメ映画"));
  rows.push(binding("Q100", "Q63952888", "有効な作品", 2020, "Q63952888", "テレビアニメシリーズ"));
  rows.push(binding("Q101", "Q63952888", "両立作品", 2020, "Q200", "アクション"));
  rows.push(binding("Q101", "Q20650540", "両立作品", 2020, "Q200", "アクション"));
  rows.push({
    item: { type: "uri", value: "http://www.wikidata.org/entity/Q102" },
    type: { type: "uri", value: "http://www.wikidata.org/entity/Q63952888" },
    title: { type: "literal", value: "Q102" },
  });
  rows.push({
    item: { type: "uri", value: "http://www.wikidata.org/entity/Q103" },
    type: { type: "uri", value: "http://www.wikidata.org/entity/Q63952888" },
    title: { type: "literal", value: "English Title", "xml:lang": "en" },
  });

  global.fetch = async (url, options) => {
    const query = new URLSearchParams(options.body).get("query");
    if (query.includes("SELECT DISTINCT ?item")) {
      return Response.json({
        results: {
          bindings: ["Q100", "Q101", "Q102", "Q103"].map(id => ({
            item: { value: `http://www.wikidata.org/entity/${id}` },
          })),
        },
      });
    }
    return Response.json({ results: { bindings: rows } });
  };
  try {
    const result = await listAnime({ mode: "browse", q: null, filters: {}, limit: 20, cursor: null });
    assert.deepEqual(result.items.map(item => item.source.providerId), ["Q100"]);
    assert.equal(result.items[0].genres.length, 35);
    assert.ok(!result.items[0].genres.some(g => ["Q63952888", "Q20650540"].includes(g.id)));
    assert.equal(result.facets.genres.length, 30);
    assert.equal(result.facets.genres[0].label, "ジャンル01");
    assert.equal(result.facets.genres[29].label, "ジャンル30");

    assert.equal(await getAnimeDetail(Buffer.from("wikidata:Q101").toString("base64url")), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("invalid upstream search continuation is rejected instead of looping", async () => {
  const originalFetch = global.fetch;
  try {
    for (const offset of [-1, "1", 1.5, null]) {
      global.fetch = async () => Response.json({ search: [], "search-continue": offset });
      await assert.rejects(listAnime({ mode: "search", q: "test", filters: {}, limit: 2, cursor: null }),
        error => error.code === "PROVIDER_UNAVAILABLE" && error.status === 502);
    }
    global.fetch = async () => Response.json({ search: [], "search-continue": 1 });
    const first = await listAnime({ mode: "search", q: "test", filters: {}, limit: 2, cursor: null });
    await assert.rejects(listAnime({ mode: "search", q: "test", filters: {}, limit: 2, cursor: first.page.nextCursor }),
      error => error.code === "PROVIDER_UNAVAILABLE");
  } finally { global.fetch = originalFetch; }
});

test("both browse requests share the owner-approved total timeout budget", async () => {
  const originalFetch = global.fetch, originalNow = Date.now, originalTimeout = AbortSignal.timeout;
  let now = 1000;
  const timeouts = [];
  Date.now = () => now;
  AbortSignal.timeout = ms => { timeouts.push(ms); return originalTimeout(ms); };
  global.fetch = async (url, options) => {
    const query = new URLSearchParams(options.body).get("query");
    if (query.includes("SELECT DISTINCT")) {
      now += 7000;
      return Response.json({ results: { bindings: [{ item: { value: "http://www.wikidata.org/entity/Q100" } }] } });
    }
    return Response.json({ results: { bindings: [binding("Q100", "Q63952888", "Test", 2013, "Q200", "Genre")] } });
  };
  try {
    await listAnime({ mode: "browse", q: null, filters: {}, limit: 2, cursor: null });
    assert.equal(REQUEST_TIMEOUT_MS, 20000);
    assert.deepEqual(timeouts, [20000, 13000]);
  } finally { global.fetch = originalFetch; Date.now = originalNow; AbortSignal.timeout = originalTimeout; }
});

test("missing labels and unexpected entities never become a fabricated detail", async () => {
  const originalFetch = global.fetch;
  const id = Buffer.from("wikidata:Q100").toString("base64url");
  try {
    const missingTitle = binding("Q100", "Q63952888", "", 2013, "Q200", "Test");
    const unrelated = binding("Q101", "Q63952888", "Other item", 2013, "Q200", "Test");
    global.fetch = async () => Response.json({ results: { bindings: [missingTitle, unrelated] } });
    assert.equal(await getAnimeDetail(id), null);
    assert.equal(await getAnimeDetail("invalid"), null);
    const missingFields = binding("Q100", "Q63952888", "Test item", 2013, "Q200", "Test");
    delete missingFields.year; delete missingFields.description;
    global.fetch = async () => Response.json({ results: { bindings: [missingFields] } });
    const detail = await getAnimeDetail(id);
    assert.equal("providerId" in detail, false);
    assert.equal(detail.source.providerId, "Q100");
    assert.equal(detail.year, null);
    assert.equal(detail.description, null);
    assert.equal(detail.episodeCount, null);
    assert.equal(detail.releaseDate, null);
  } finally { global.fetch = originalFetch; }
});

test("getAnimeDetail maps verified releaseDate precision and picks earliest valid date", async () => {
  const originalFetch = global.fetch;
  const id = Buffer.from("wikidata:Q21697406").toString("base64url");
  try {
    global.fetch = async (url, options) => {
      const query = new URLSearchParams(options.body).get("query");
      assert.match(query, /\?dateValue \?precision/);
      return Response.json({
        results: {
          bindings: [
            detailDateBinding("Q21697406", "Q20650540", "君の名は。", "+2016-12-01T00:00:00Z", 11),
            detailDateBinding("Q21697406", "Q20650540", "君の名は。", "+2016-08-26T00:00:00Z", 11),
          ],
        },
      });
    };
    const dayDetail = await getAnimeDetail(id);
    assert.equal(dayDetail.year, 2016);
    assert.deepEqual(dayDetail.releaseDate, { year: 2016, month: 8, day: 26, precision: "day" });
    assert.equal(dayDetail.episodeCount, null);

    global.fetch = async () => Response.json({
      results: {
        bindings: [detailDateBinding("Q21697406", "Q20650540", "君の名は。", "2016-08-01T00:00:00Z", 10)],
      },
    });
    const monthDetail = await getAnimeDetail(id);
    assert.deepEqual(monthDetail.releaseDate, { year: 2016, month: 8, day: null, precision: "month" });

    global.fetch = async () => Response.json({
      results: {
        bindings: [detailDateBinding("Q21697406", "Q20650540", "君の名は。", "2016-01-01T00:00:00Z", 9)],
      },
    });
    const yearDetail = await getAnimeDetail(id);
    assert.deepEqual(yearDetail.releaseDate, { year: 2016, month: null, day: null, precision: "year" });

    global.fetch = async () => Response.json({
      results: {
        bindings: [detailDateBinding("Q21697406", "Q20650540", "君の名は。", "2010-01-01T00:00:00Z", 8)],
      },
    });
    const lowPrecisionDetail = await getAnimeDetail(id);
    assert.equal(lowPrecisionDetail.year, null);
    assert.equal(lowPrecisionDetail.releaseDate, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("buildSparql and listAnime reject unvalidated QIDs, filters, and search queries", async () => {
  assert.throws(() => buildSparql({ candidateIds: ["Q1; DROP"], limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ after: "bad", limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ filters: { genreId: "Q63952888" }, limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ filters: { genreId: "Q20650540" }, limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ filters: { entityType: "ova" }, limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ filters: { year: 0 }, limit: 1 }), error => error.status === 400);
  assert.throws(() => buildSparql({ limit: 99 }), error => error.status === 400);

  for (const invalid of [
    { mode: "other" },
    { mode: "browse", q: "anime" },
    { mode: "search", q: "   " },
    { mode: "search", q: "あ".repeat(121) },
    { mode: "browse", limit: 21 },
    { mode: "browse", filters: { genreId: "Q20650540" } },
    { mode: "browse", filters: { year: "2013" } },
  ]) {
    await assert.rejects(listAnime(invalid), error => error instanceof ApiError && error.status === 400);
  }
});
