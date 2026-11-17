const crypto = require("node:crypto");

const TYPE_IDS = Object.freeze({ anime_tv: "Q63952888", anime_film: "Q20650540" });
const TYPE_NAMES = Object.fromEntries(Object.entries(TYPE_IDS).map(([name, id]) => [id, name]));
const GENRE_TYPE_IDS = ["Q201658", "Q4178140"];
const MEDIA_TYPE_IDS = Object.values(TYPE_IDS);
const ACTION_API = "https://www.wikidata.org/w/api.php";
const SPARQL_ENDPOINTS = new Set([
  "https://query.wikidata.org/sparql",
  "https://query-next.wikidata.org/sparql",
]);
const SPARQL_ENDPOINT = process.env.WIKIDATA_SPARQL_ENDPOINT || "https://query.wikidata.org/sparql";
const USER_AGENT = process.env.WIKIDATA_USER_AGENT || "AnimeWebsite/0.4 (+https://github.com/kenmini098-hash/web)";
const REQUEST_TIMEOUT_MS = 20000;
let activeRequests = 0;
const QID_PATTERN = /^Q[1-9][0-9]*$/;
const cursorSecret = process.env.CURSOR_SIGNING_KEY
  ? Buffer.from(process.env.CURSOR_SIGNING_KEY)
  : crypto.randomBytes(32);
// shortcut: cursors are invalid after restart without CURSOR_SIGNING_KEY; set a stable key before multi-instance deployment.

if (!SPARQL_ENDPOINTS.has(SPARQL_ENDPOINT)) {
  throw new Error("WIKIDATA_SPARQL_ENDPOINT must be an approved Wikidata endpoint");
}
if (process.env.CURSOR_SIGNING_KEY && Buffer.byteLength(process.env.CURSOR_SIGNING_KEY) < 32) {
  throw new Error("CURSOR_SIGNING_KEY must contain at least 32 bytes");
}

class ApiError extends Error {
  constructor(status, code, message, retryAfter = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function invalidRequest() {
  return new ApiError(400, "INVALID_REQUEST", "The request is invalid.");
}

function entityIdFromUri(value) {
  const match = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/.exec(value || "");
  return match && QID_PATTERN.test(match[1]) ? match[1] : null;
}

function encodeAnimeId(qid) {
  return Buffer.from(`wikidata:${qid}`).toString("base64url");
}

function decodeAnimeId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (Buffer.from(decoded).toString("base64url") !== value) return null;
    const match = /^wikidata:(Q[1-9][0-9]*)$/.exec(decoded);
    return match && QID_PATTERN.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

function queryFingerprint(query) {
  return crypto.createHash("sha256").update(query || "").digest("base64url");
}

function encodeCursor(payload) {
  const body = Buffer.from(JSON.stringify({ v: 1, ...payload })).toString("base64url");
  const signature = crypto.createHmac("sha256", cursorSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeCursor(token) {
  if (typeof token !== "string" || token.length > 4096) throw invalidRequest();
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) throw invalidRequest();
  const expected = crypto.createHmac("sha256", cursorSecret).update(body).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    throw invalidRequest();
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw invalidRequest();
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.v !== 1) throw invalidRequest();
    return payload;
  } catch {
    throw invalidRequest();
  }
}

function normalizeFilters(filters) {
  return {
    entityType: filters.entityType || null,
    genreId: filters.genreId || null,
    year: filters.year || null,
  };
}

function verifyCursorContext(payload, { mode, q, filters, limit }) {
  if (
    payload.mode !== mode ||
    payload.queryHash !== queryFingerprint(q) ||
    payload.limit !== limit ||
    JSON.stringify(payload.filters) !== JSON.stringify(normalizeFilters(filters))
  ) {
    throw invalidRequest();
  }
}

async function fetchJson(url, options, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ApiError(504, "PROVIDER_TIMEOUT", "The data source timed out.");
  if (activeRequests >= 2) throw new ApiError(503, "SERVICE_UNAVAILABLE", "Provider request capacity reached.", "1");

  let response;
  let text;
  activeRequests++;
  try {
    response = await fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(remaining) });
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new ApiError(429, "RATE_LIMITED", "The data source asked us to slow down.", retryAfter);
    }
    if (!response.ok) throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source is unavailable.");
    const reader = response.body?.getReader();
    const chunks = [];
    let bytes = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 2_000_000) {
            await reader.cancel();
            throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an oversized response.");
          }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
    }
    text = Buffer.concat(chunks).toString("utf8");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new ApiError(504, "PROVIDER_TIMEOUT", "The data source timed out.");
    }
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source is unavailable.");
  } finally {
    activeRequests--;
  }

  let body;
  try {
    if (Buffer.byteLength(text) > 2_000_000) throw new Error("Response too large");
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid response object");
  } catch {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }
  return body;
}

async function searchEntities(q, limit, continuation, deadline) {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: q,
    language: "ja",
    uselang: "ja",
    type: "item",
    limit: String(limit),
    format: "json",
  });
  if (continuation?.searchContinue !== undefined) {
    params.set("continue", String(continuation.searchContinue));
  }

  const body = await fetchJson(`${ACTION_API}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  }, deadline);
  if (body.error || !Array.isArray(body.search) || !body.search.every(item => item && typeof item.id === "string")) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }

  const ids = body.search.map(item => item.id).filter(id => QID_PATTERN.test(id || ""));
  const offset = body["search-continue"];
  if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0 || offset <= (continuation?.searchContinue ?? -1))) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid continuation.");
  }
  const next = offset === undefined ? null : { searchContinue: offset };
  return { ids, next };
}

function buildSparql({ candidateIds, filters, after, limit, idsOnly = false }) {
  const classValues = Object.values(TYPE_IDS).map(id => `wd:${id}`).join(" ");
  const candidateValues = candidateIds?.length
    ? `VALUES ?item { ${candidateIds.map(id => `wd:${id}`).join(" ")} }`
    : "";
  const afterFilter = after ? `FILTER(STR(?item) > STR(wd:${after}))` : "";
  const typeFilter = filters.entityType ? `FILTER(?type = wd:${TYPE_IDS[filters.entityType]})` : "";
  const genreFilter = filters.genreId ? `
      FILTER EXISTS {
        ?item wdt:P136 wd:${filters.genreId} .
        wd:${filters.genreId} wdt:P31 ?filterGenreType ; rdfs:label ?filterGenreLabel .
        VALUES ?filterGenreType { ${GENRE_TYPE_IDS.map(id => `wd:${id}`).join(" ")} }
        FILTER(wd:${filters.genreId} NOT IN (${MEDIA_TYPE_IDS.map(id => `wd:${id}`).join(", ")}))
        FILTER(LANG(?filterGenreLabel) = "ja")
      }` : "";
  const yearHaving = filters.year ? `HAVING (MIN(?yearCandidate) = ${filters.year})` : "";
  const qualification = `
      ${candidateValues}
      VALUES ?type { ${classValues} }
      ?item wdt:P31 ?type .
      FILTER NOT EXISTS {
        ?item wdt:P31 wd:${TYPE_IDS.anime_tv}, wd:${TYPE_IDS.anime_film} .
      }
      ${typeFilter}
      ${afterFilter}
      ?item rdfs:label ?title .
      FILTER(LANG(?title) = "ja")`;
  const prefixes = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>`;
  if (idsOnly) {
    return `${prefixes}
SELECT DISTINCT ?item WHERE { ${qualification} ${genreFilter} }
ORDER BY STR(?item) LIMIT ${limit}`;
  }
  return `${prefixes}
SELECT ?item ?type ?title ?description ?year ?genre ?genreLabel
WHERE {
  {
    SELECT ?item ?type ?title (SAMPLE(?descriptionValue) AS ?description) (MIN(?yearCandidate) AS ?year)
    WHERE {
      ${qualification}
      OPTIONAL {
        ?item schema:description ?descriptionValue .
        FILTER(LANG(?descriptionValue) = "ja")
      }
      OPTIONAL {
        {
          VALUES ?type { wd:${TYPE_IDS.anime_tv} }
          ${candidateValues}
          ?item wdt:P31 wd:${TYPE_IDS.anime_tv} .
          ?item p:P580 ?dateStatement .
          ?dateStatement psv:P580 ?timeNode .
          ?timeNode wikibase:timeValue ?dateValue ; wikibase:timePrecision ?precision .
        }
        UNION
        {
          VALUES ?type { wd:${TYPE_IDS.anime_film} }
          ${candidateValues}
          ?item wdt:P31 wd:${TYPE_IDS.anime_film} .
          ?item p:P577 ?dateStatement .
          ?dateStatement ps:P577 ?dateValue ; pq:P291 wd:Q17 ; psv:P577 ?timeNode .
          ?timeNode wikibase:timeValue ?dateValue ; wikibase:timePrecision ?precision .
        }
        ?dateStatement wikibase:rank ?dateRank .
        FILTER(?dateRank != wikibase:DeprecatedRank)
        FILTER(?precision >= 9)
        BIND(YEAR(?dateValue) AS ?yearCandidate)
      }
      ${genreFilter}
    }
    GROUP BY ?item ?type ?title
    ${yearHaving}
    ORDER BY STR(?item)
    LIMIT ${limit}
  }
  OPTIONAL {
    ?item wdt:P136 ?genre .
    ?genre wdt:P31 ?genreType ; rdfs:label ?genreLabel .
    VALUES ?genreType { ${GENRE_TYPE_IDS.map(id => `wd:${id}`).join(" ")} }
    FILTER(?genre NOT IN (${MEDIA_TYPE_IDS.map(id => `wd:${id}`).join(", ")}))
    FILTER(LANG(?genreLabel) = "ja")
  }
}
ORDER BY STR(?item) ?genreLabel`;
}

async function queryRecords({ candidateIds, filters, after, limit, deadline }) {
  // Without a year filter, qualify/page first and enrich only those IDs, under the same deadline.
  if (!candidateIds && !filters.year) {
    const rows = await runSparql(buildSparql({ candidateIds, filters, after, limit, idsOnly: true }), deadline);
    candidateIds = [...new Set(rows.map(row => entityIdFromUri(row.item?.value)).filter(Boolean))];
    if (!candidateIds.length) return [];
  }
  const rows = await runSparql(buildSparql({ candidateIds, filters, after, limit }), deadline);
  return candidateIds ? rows.filter(row => candidateIds.includes(entityIdFromUri(row.item?.value))) : rows;
}

async function runSparql(sparql, deadline) {
  const body = await fetchJson(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query: sparql, format: "json" }).toString(),
  }, deadline);
  if (!Array.isArray(body.results?.bindings) || !body.results.bindings.every(row => row && typeof row === "object")) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }
  return body.results.bindings;
}

function recordsFromBindings(bindings, candidateIds = null) {
  const records = new Map();
  for (const row of bindings) {
    const qid = entityIdFromUri(row.item?.value);
    const typeId = entityIdFromUri(row.type?.value);
    if (!qid || !TYPE_NAMES[typeId] || !row.title?.value) continue;
    let record = records.get(qid);
    if (!record) {
      const year = Number(row.year?.value);
      record = {
        providerId: qid,
        id: encodeAnimeId(qid),
        title: row.title.value,
        description: row.description?.value || null,
        entityType: TYPE_NAMES[typeId],
        genres: [],
        year: Number.isInteger(year) && year >= 1 && year <= 9999 ? year : null,
        source: {
          provider: "wikidata",
          providerId: qid,
          uri: `https://www.wikidata.org/entity/${qid}`,
          fetchedAt: new Date().toISOString(),
        },
      };
      record._genres = new Map();
      records.set(qid, record);
    }
    const genreId = entityIdFromUri(row.genre?.value);
    const genreLabel = row.genreLabel?.value;
    if (genreId && genreLabel) record._genres.set(genreId, { id: genreId, label: genreLabel });
  }

  let list = [...records.values()].map(record => {
    record.genres = [...record._genres.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "ja") || a.id.localeCompare(b.id));
    delete record._genres;
    return record;
  });
  if (candidateIds) {
    const byId = new Map(list.map(item => [item.providerId, item]));
    list = candidateIds.map(id => byId.get(id)).filter(Boolean);
  }
  return list;
}

function makeFacets(items) {
  const genres = new Map();
  for (const item of items) {
    for (const genre of item.genres) genres.set(genre.id, genre);
  }
  return [...genres.values()]
    .sort((a, b) => a.label.localeCompare(b.label, "ja") || a.id.localeCompare(b.id))
    .slice(0, 30);
}

function isFiltered(filters) {
  return Boolean(filters.entityType || filters.genreId || filters.year);
}

function buildNextCursor({ mode, q, filters, limit, after, continuation, allowedGenreIds }) {
  const positionAvailable = mode === "browse" ? Boolean(after) : Boolean(continuation);
  if (!positionAvailable) return null;
  return encodeCursor({
    mode,
    queryHash: queryFingerprint(q),
    filters: normalizeFilters(filters),
    limit,
    after: after || null,
    continuation: continuation || null,
    allowedGenreIds: allowedGenreIds || [],
  });
}

async function listAnime({ mode, q, filters, limit, cursor }) {
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const normalized = normalizeFilters(filters);
  const cursorData = cursor ? decodeCursor(cursor) : null;
  if (cursorData) verifyCursorContext(cursorData, { mode, q, filters: normalized, limit });

  let allowedGenreIds = cursorData?.allowedGenreIds || [];
  let candidateIds = null;
  let searchNext = null;
  if (mode === "search") {
    const result = await searchEntities(q, limit, cursorData?.continuation, deadline);
    candidateIds = result.ids;
    searchNext = result.next;
    if (candidateIds.length === 0) {
      if (normalized.genreId && !allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();
      const nextCursor = buildNextCursor({
        mode,
        q,
        filters: normalized,
        limit,
        continuation: searchNext,
        allowedGenreIds,
      });
      return { items: [], page: { limit, nextCursor }, facets: { genres: [] } };
    }
  }

  let facets = [];
  if (!cursorData && !isFiltered(normalized)) {
    const bindings = await queryRecords({
      candidateIds,
      filters: normalized,
      after: null,
      limit: mode === "browse" ? limit + 1 : limit,
      deadline,
    });
    const allItems = recordsFromBindings(bindings, candidateIds);
    const hasMore = mode === "browse" && allItems.length > limit;
    const items = allItems.slice(0, limit);
    facets = makeFacets(items);
    allowedGenreIds = facets.map(facet => facet.id);
    const nextCursor = mode === "browse"
      ? buildNextCursor({ mode, q, filters: normalized, limit, after: hasMore ? items.at(-1)?.providerId : null, allowedGenreIds })
      : buildNextCursor({ mode, q, filters: normalized, limit, continuation: searchNext, allowedGenreIds });
    return { items, page: { limit, nextCursor }, facets: { genres: facets } };
  }

  if (!cursorData && normalized.genreId) {
    const baseBindings = await queryRecords({
      candidateIds,
      filters: normalizeFilters({}),
      after: null,
      limit: mode === "browse" ? limit : candidateIds.length,
      deadline,
    });
    facets = makeFacets(recordsFromBindings(baseBindings, candidateIds).slice(0, limit));
    allowedGenreIds = facets.map(facet => facet.id);
    if (!allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();
  }
  if (normalized.genreId && !allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();

  const bindings = await queryRecords({
    candidateIds,
    filters: normalized,
    after: cursorData?.after || null,
    limit: mode === "browse" ? limit + 1 : Math.max(candidateIds.length, 1),
    deadline,
  });
  const allItems = recordsFromBindings(bindings, candidateIds);
  const hasMore = mode === "browse" && allItems.length > limit;
  const items = allItems.slice(0, limit);
  const nextCursor = mode === "browse"
    ? buildNextCursor({ mode, q, filters: normalized, limit, after: hasMore ? items.at(-1)?.providerId : null, allowedGenreIds })
    : buildNextCursor({ mode, q, filters: normalized, limit, continuation: searchNext, allowedGenreIds });
  return { items, page: { limit, nextCursor }, facets: { genres: [] } };
}

async function getAnimeDetail(animeId, deadline = Date.now() + REQUEST_TIMEOUT_MS) {
  const qid = decodeAnimeId(animeId);
  if (!qid) return null;
  const bindings = await queryRecords({
    candidateIds: [qid],
    filters: normalizeFilters({}),
    after: null,
    limit: 1,
    deadline,
  });
  const summary = recordsFromBindings(bindings, [qid])[0];
  if (!summary) return null;
  return { ...summary, releaseDate: null, episodeCount: null };
}

module.exports = { ApiError, listAnime, getAnimeDetail, buildSparql, REQUEST_TIMEOUT_MS };
