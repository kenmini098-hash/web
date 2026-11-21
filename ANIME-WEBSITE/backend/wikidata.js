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
const MAX_LIMIT = 20;
const MAX_RESPONSE_BYTES = 2_000_000;
const MIN_RETRY_REMAINING_MS = 250;
let activeRequests = 0;
const QID_PATTERN = /^Q[1-9][0-9]*$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const cursorSecret = process.env.CURSOR_SIGNING_KEY
  ? Buffer.from(process.env.CURSOR_SIGNING_KEY)
  : crypto.randomBytes(32);
// shortcut: cursors are invalid after restart without CURSOR_SIGNING_KEY; set a stable key before multi-instance deployment.

const SPARQL_PREFIXES = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

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

function validateQid(value) {
  if (typeof value !== "string" || !QID_PATTERN.test(value)) throw invalidRequest();
  return value;
}

function validateLimit(limit, max = MAX_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1 || limit > max) throw invalidRequest();
  return limit;
}

function normalizeFilters(filters = {}) {
  return {
    entityType: filters.entityType || null,
    genreId: filters.genreId || null,
    year: filters.year ?? null,
  };
}

function validateFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) throw invalidRequest();
  const normalized = normalizeFilters(filters);
  if (normalized.entityType !== null && !Object.hasOwn(TYPE_IDS, normalized.entityType)) {
    throw invalidRequest();
  }
  if (normalized.genreId !== null) {
    validateQid(normalized.genreId);
    if (MEDIA_TYPE_IDS.includes(normalized.genreId)) throw invalidRequest();
  }
  if (normalized.year !== null) {
    if (!Number.isInteger(normalized.year) || normalized.year < 1 || normalized.year > 9999) {
      throw invalidRequest();
    }
  }
  return normalized;
}

function validateListParams({ mode, q = null, filters = {}, limit = MAX_LIMIT, cursor = null }) {
  if (mode !== "browse" && mode !== "search") throw invalidRequest();
  let normalizedQ = null;
  if (mode === "search") {
    if (typeof q !== "string") throw invalidRequest();
    normalizedQ = q.trim();
    const codePoints = Array.from(normalizedQ).length;
    if (codePoints < 1 || codePoints > 120) throw invalidRequest();
  } else if (q !== null && q !== undefined && q !== "") {
    throw invalidRequest();
  }
  return {
    mode,
    q: normalizedQ,
    filters: validateFilters(filters),
    limit: validateLimit(limit, MAX_LIMIT),
    cursor: cursor ?? null,
  };
}

function entityIdFromUri(value) {
  if (typeof value !== "string") return null;
  const match = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9][0-9]*)$/.exec(value);
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
  if (!BASE64URL_PATTERN.test(body) || !BASE64URL_PATTERN.test(signature)) throw invalidRequest();
  const expected = crypto.createHmac("sha256", cursorSecret).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw invalidRequest();
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw invalidRequest();
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.v !== 1) {
    throw invalidRequest();
  }
  if (payload.mode !== "browse" && payload.mode !== "search") throw invalidRequest();
  if (!Array.isArray(payload.allowedGenreIds) || payload.allowedGenreIds.some(id => !QID_PATTERN.test(id || ""))) {
    throw invalidRequest();
  }
  if (payload.after !== null && (typeof payload.after !== "string" || !QID_PATTERN.test(payload.after))) {
    throw invalidRequest();
  }
  if (payload.mode === "browse" && !payload.after) throw invalidRequest();
  if (payload.mode === "search") {
    const step = payload.continuation?.searchContinue;
    if (!Number.isSafeInteger(step) || step < 0) throw invalidRequest();
  }
  return payload;
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

class RetryableUpstreamError extends Error {
  constructor(cause) {
    super(cause.message);
    this.cause = cause;
  }
}

async function readResponseText(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an oversized response.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchJsonOnce(url, options, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ApiError(504, "PROVIDER_TIMEOUT", "The data source timed out.");
  if (activeRequests >= 2) throw new ApiError(503, "SERVICE_UNAVAILABLE", "Provider request capacity reached.", "1");

  let text;
  activeRequests++;
  try {
    const response = await fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(remaining) });
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new ApiError(429, "RATE_LIMITED", "The data source asked us to slow down.", retryAfter);
    }
    if (!response.ok) {
      const apiError = new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source is unavailable.");
      if (response.status >= 500) throw new RetryableUpstreamError(apiError);
      throw apiError;
    }
    text = await readResponseText(response);
  } catch (error) {
    if (error instanceof ApiError || error instanceof RetryableUpstreamError) throw error;
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new ApiError(504, "PROVIDER_TIMEOUT", "The data source timed out.");
    }
    throw new RetryableUpstreamError(
      new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source is unavailable."),
    );
  } finally {
    activeRequests--;
  }

  try {
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error("Response too large");
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid response object");
    return body;
  } catch {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }
}

/**
 * Executes a read-only provider request with bounded concurrency, response size cap,
 * and at most one jittered retry on transient upstream failures when deadline permits.
 */
async function fetchJson(url, options, deadline, { retryable = true } = {}) {
  try {
    return await fetchJsonOnce(url, options, deadline);
  } catch (error) {
    if (!(error instanceof RetryableUpstreamError)) throw error;
    if (!retryable) throw error.cause;
    const remaining = deadline - Date.now();
    const jitterMs = 40 + Math.floor(Math.random() * 80);
    if (remaining <= jitterMs + MIN_RETRY_REMAINING_MS) throw error.cause;
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    if (deadline - Date.now() <= 0) throw error.cause;
    try {
      return await fetchJsonOnce(url, options, deadline);
    } catch (retryError) {
      if (retryError instanceof RetryableUpstreamError) throw retryError.cause;
      throw retryError;
    }
  }
}

async function searchEntities(q, limit, continuation, deadline) {
  const safeLimit = validateLimit(limit, MAX_LIMIT);
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: q,
    language: "ja",
    uselang: "ja",
    type: "item",
    limit: String(safeLimit),
    format: "json",
  });
  if (continuation?.searchContinue !== undefined) {
    params.set("continue", String(continuation.searchContinue));
  }

  const body = await fetchJson(`${ACTION_API}?${params}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  }, deadline);
  if (
    body.error ||
    !Array.isArray(body.search) ||
    !body.search.every(item => item && typeof item === "object" && !Array.isArray(item) && typeof item.id === "string")
  ) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }

  const ids = [...new Set(body.search.map(item => item.id).filter(id => QID_PATTERN.test(id)))].slice(0, safeLimit);
  const offset = body["search-continue"];
  if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0 || offset <= (continuation?.searchContinue ?? -1))) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid continuation.");
  }
  const next = offset === undefined ? null : { searchContinue: offset };
  return { ids, next };
}

function buildGenreFilter(genreId) {
  if (!genreId) return "";
  return `
      ?item wdt:P136 wd:${genreId} .
      FILTER EXISTS {
        wd:${genreId} wdt:P31 ?filterGenreType ; rdfs:label ?filterGenreLabel .
        VALUES ?filterGenreType { ${GENRE_TYPE_IDS.map(id => `wd:${id}`).join(" ")} }
        FILTER(wd:${genreId} NOT IN (${MEDIA_TYPE_IDS.map(id => `wd:${id}`).join(", ")}))
        FILTER(LANG(?filterGenreLabel) = "ja")
      }`;
}

function buildDateBranch(typeKey, candidateValues = "", { statementVar = "?dateStatement", nodeVar = "?timeNode", valueVar = "?dateValue", precisionVar = "?precision" } = {}) {
  if (typeKey === "anime_tv") {
    return `{
          VALUES ?type { wd:${TYPE_IDS.anime_tv} }
          ${candidateValues}
          ?item wdt:P31 wd:${TYPE_IDS.anime_tv} .
          ?item p:P580 ${statementVar} .
          ${statementVar} psv:P580 ${nodeVar} .
          ${nodeVar} wikibase:timeValue ${valueVar} ; wikibase:timePrecision ${precisionVar} .
        }`;
  }
  return `{
          VALUES ?type { wd:${TYPE_IDS.anime_film} }
          ${candidateValues}
          ?item wdt:P31 wd:${TYPE_IDS.anime_film} .
          ?item p:P577 ${statementVar} .
          ${statementVar} pq:P291 wd:Q17 ; psv:P577 ${nodeVar} .
          ${nodeVar} wikibase:timeValue ${valueVar} ; wikibase:timePrecision ${precisionVar} .
        }`;
}

function buildTypeDateCondition(entityType, candidateValues = "") {
  if (entityType) return buildDateBranch(entityType, candidateValues);
  return `${buildDateBranch("anime_tv", candidateValues)}
        UNION
        ${buildDateBranch("anime_film", candidateValues)}`;
}

function buildIdsOnlyYearBranch(typeKey, year, genreFilter, afterFilter, candidateValues = "") {
  const start = `"${String(year).padStart(4, "0")}-01-01T00:00:00Z"^^xsd:dateTime`;
  const rangeCondition = year < 9999
    ? `?dateValue >= ${start} && ?dateValue < "${String(year + 1).padStart(4, "0")}-01-01T00:00:00Z"^^xsd:dateTime`
    : `?dateValue >= ${start} && YEAR(?dateValue) = 9999`;
  const prop = typeKey === "anime_tv" ? "P580" : "P577";
  const qualifier = typeKey === "anime_film" ? "pq:P291 wd:Q17 ; " : "";
  return `
      ${genreFilter}
      ${candidateValues}
      ?item wdt:P31 wd:${TYPE_IDS[typeKey]} .
      ?item p:${prop} ?dateStatement .
      ?dateStatement ${qualifier}wikibase:rank ?dateRank ; psv:${prop} ?timeNode .
      ?timeNode wikibase:timeValue ?dateValue ; wikibase:timePrecision ?precision .
      FILTER(?dateRank != wikibase:DeprecatedRank && ?precision >= 9)
      FILTER(${rangeCondition})
      FILTER NOT EXISTS {
        ?item p:${prop} ?earlierStmt .
        ?earlierStmt ${qualifier}wikibase:rank ?earlierRank ; psv:${prop} ?earlierNode .
        ?earlierNode wikibase:timeValue ?earlierDate ; wikibase:timePrecision ?earlierPrec .
        FILTER(?earlierRank != wikibase:DeprecatedRank && ?earlierPrec >= 9 && ?earlierDate < ${start})
      }
      FILTER NOT EXISTS {
        ?item wdt:P31 wd:${TYPE_IDS.anime_tv}, wd:${TYPE_IDS.anime_film} .
      }
      ${afterFilter}
      ?item rdfs:label ?title .
      FILTER(LANG(?title) = "ja")`;
}

const GENRE_OPTIONAL_CLAUSE = `
  OPTIONAL {
    ?item wdt:P136 ?genre .
    ?genre wdt:P31 ?genreType ; rdfs:label ?genreLabel .
    VALUES ?genreType { ${GENRE_TYPE_IDS.map(id => `wd:${id}`).join(" ")} }
    FILTER(?genre NOT IN (${MEDIA_TYPE_IDS.map(id => `wd:${id}`).join(", ")}))
    FILTER(LANG(?genreLabel) = "ja")
  }`;

/**
 * Builds a fixed-template SPARQL query from validated QIDs and filters only.
 */
function buildSparql({ candidateIds = null, filters = {}, after = null, limit = MAX_LIMIT, idsOnly = false, includeReleaseDate = false }) {
  let safeCandidateIds = null;
  if (candidateIds !== null && candidateIds !== undefined) {
    if (!Array.isArray(candidateIds)) throw invalidRequest();
    if (candidateIds.length > MAX_LIMIT + 1) throw invalidRequest();
    if (candidateIds.length) safeCandidateIds = candidateIds.map(validateQid);
  }
  const safeFilters = validateFilters(filters);
  const safeAfter = after ? validateQid(after) : null;
  const safeLimit = validateLimit(limit, MAX_LIMIT + 1);

  const selectedTypeIds = safeFilters.entityType ? [TYPE_IDS[safeFilters.entityType]] : Object.values(TYPE_IDS);
  const classValues = selectedTypeIds.map(id => `wd:${id}`).join(" ");
  const candidateValues = safeCandidateIds ? `VALUES ?item { ${safeCandidateIds.map(id => `wd:${id}`).join(" ")} }` : "";
  const afterFilter = safeAfter ? `FILTER(STR(?item) > STR(wd:${safeAfter}))` : "";
  const genreFilter = buildGenreFilter(safeFilters.genreId);
  const qualification = `
      ${genreFilter}
      ${candidateValues}
      VALUES ?type { ${classValues} }
      ?item wdt:P31 ?type .
      FILTER NOT EXISTS {
        ?item wdt:P31 wd:${TYPE_IDS.anime_tv}, wd:${TYPE_IDS.anime_film} .
      }
      ${afterFilter}
      ?item rdfs:label ?title .
      FILTER(LANG(?title) = "ja")`;

  if (idsOnly) {
    if (safeFilters.year) {
      if (safeFilters.entityType) {
        return `${SPARQL_PREFIXES}
SELECT DISTINCT ?item WHERE { ${buildIdsOnlyYearBranch(safeFilters.entityType, safeFilters.year, genreFilter, afterFilter, candidateValues)} }
ORDER BY ?item LIMIT ${safeLimit}`;
      }
      return `${SPARQL_PREFIXES}
SELECT DISTINCT ?item WHERE {
  {
    SELECT DISTINCT ?item WHERE { ${buildIdsOnlyYearBranch("anime_tv", safeFilters.year, genreFilter, afterFilter, candidateValues)} }
    ORDER BY ?item LIMIT ${safeLimit}
  }
  UNION
  {
    SELECT DISTINCT ?item WHERE { ${buildIdsOnlyYearBranch("anime_film", safeFilters.year, genreFilter, afterFilter, candidateValues)} }
    ORDER BY ?item LIMIT ${safeLimit}
  }
}
ORDER BY ?item LIMIT ${safeLimit}`;
    }
    return `${SPARQL_PREFIXES}
SELECT DISTINCT ?item WHERE { ${qualification} }
ORDER BY ?item LIMIT ${safeLimit}`;
  }

  const datePattern = buildTypeDateCondition(safeFilters.entityType, candidateValues);
  if (includeReleaseDate) {
    return `${SPARQL_PREFIXES}
SELECT ?item ?type ?title ?description ?dateValue ?precision ?genre ?genreLabel
WHERE {
  ${qualification}
  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) = "ja")
  }
  OPTIONAL {
    ${datePattern}
    ?dateStatement wikibase:rank ?dateRank .
    FILTER(?dateRank != wikibase:DeprecatedRank)
    FILTER(?precision >= 9)
  }
  ${GENRE_OPTIONAL_CLAUSE}
}
ORDER BY ?item ?genreLabel`;
  }

  const yearHaving = safeFilters.year ? `HAVING (MIN(?yearCandidate) = ${safeFilters.year})` : "";
  return `${SPARQL_PREFIXES}
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
        ${datePattern}
        ?dateStatement wikibase:rank ?dateRank .
        FILTER(?dateRank != wikibase:DeprecatedRank)
        FILTER(?precision >= 9)
        BIND(YEAR(?dateValue) AS ?yearCandidate)
      }
    }
    GROUP BY ?item ?type ?title
    ${yearHaving}
    ORDER BY ?item
    LIMIT ${safeLimit}
  }
  ${GENRE_OPTIONAL_CLAUSE}
}
ORDER BY ?item ?genreLabel`;
}

function buildGenreFacetsSparql(candidateIds) {
  const safeIds = candidateIds.map(validateQid);
  return `${SPARQL_PREFIXES}
SELECT DISTINCT ?genre ?genreLabel WHERE {
  VALUES ?item { ${safeIds.map(id => `wd:${id}`).join(" ")} }
  ?item wdt:P136 ?genre .
  ?genre wdt:P31 ?genreType ; rdfs:label ?genreLabel .
  VALUES ?genreType { ${GENRE_TYPE_IDS.map(id => `wd:${id}`).join(" ")} }
  FILTER(?genre NOT IN (${MEDIA_TYPE_IDS.map(id => `wd:${id}`).join(", ")}))
  FILTER(LANG(?genreLabel) = "ja")
}`;
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
  if (
    !Array.isArray(body.results?.bindings) ||
    !body.results.bindings.every(row => row && typeof row === "object" && !Array.isArray(row))
  ) {
    throw new ApiError(502, "PROVIDER_UNAVAILABLE", "The data source returned an invalid response.");
  }
  return body.results.bindings;
}

async function queryRecords({ candidateIds, filters, after, limit, deadline, includeReleaseDate = false }) {
  if (!candidateIds) {
    const rows = await runSparql(buildSparql({ candidateIds: null, filters, after, limit, idsOnly: true }), deadline);
    candidateIds = [...new Set(rows.map(row => entityIdFromUri(row.item?.value)).filter(Boolean))];
    if (!candidateIds.length) return [];
    after = null;
    limit = candidateIds.length;
  }
  const rows = await runSparql(
    buildSparql({ candidateIds, filters, after, limit, includeReleaseDate }),
    deadline,
  );
  const allowed = new Set(candidateIds);
  return rows.filter(row => allowed.has(entityIdFromUri(row.item?.value)));
}

function validJapaneseLiteral(literal) {
  if (!literal || typeof literal !== "object") return null;
  if (literal["xml:lang"] !== undefined && literal["xml:lang"] !== "ja") return null;
  if (typeof literal.value !== "string") return null;
  const text = literal.value.trim();
  if (!text) return null;
  if (literal["xml:lang"] === undefined && QID_PATTERN.test(text)) return null;
  return text;
}

function parseYear(value) {
  if (value === undefined || value === null || value === "") return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1 && year <= 9999 ? year : null;
}

function parseReleaseDate(dateValue, precisionValue) {
  if (typeof dateValue !== "string") return null;
  const match = /^\+?(\d{4,})-(\d{2})-(\d{2})T/.exec(dateValue);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const precision = Number(precisionValue);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(precision) || precision < 9) return null;
  if (precision === 9) return { year, month: null, day: null, precision: "year" };
  if (precision === 10) {
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    return { year, month, day: null, precision: "month" };
  }
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day, precision: "day" };
}

function compareReleaseDates(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  const aMonth = a.month ?? 13;
  const bMonth = b.month ?? 13;
  if (aMonth !== bMonth) return aMonth - bMonth;
  const aDay = a.day ?? 32;
  const bDay = b.day ?? 32;
  return aDay - bDay;
}

function compareGenres(a, b) {
  return a.label.localeCompare(b.label, "ja") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function recordsFromBindings(bindings, candidateIds = null, { includeReleaseDate = false } = {}) {
  const records = new Map();
  const conflicted = new Set();

  for (const row of bindings) {
    const qid = entityIdFromUri(row.item?.value);
    const typeId = entityIdFromUri(row.type?.value);
    const title = validJapaneseLiteral(row.title);
    if (!qid || !TYPE_NAMES[typeId] || !title || conflicted.has(qid)) continue;

    let record = records.get(qid);
    if (record && record.entityType !== TYPE_NAMES[typeId]) {
      records.delete(qid);
      conflicted.add(qid);
      continue;
    }

    const description = validJapaneseLiteral(row.description);
    if (!record) {
      record = {
        id: encodeAnimeId(qid),
        title,
        description,
        entityType: TYPE_NAMES[typeId],
        genres: [],
        year: parseYear(row.year?.value),
        source: {
          provider: "wikidata",
          providerId: qid,
          uri: `https://www.wikidata.org/entity/${qid}`,
          fetchedAt: new Date().toISOString(),
        },
        _genres: new Map(),
        _releaseDate: null,
      };
      records.set(qid, record);
    } else if (!record.description && description) {
      record.description = description;
    }

    const candidateDate = parseReleaseDate(row.dateValue?.value, row.precision?.value);
    if (candidateDate) {
      if (!record._releaseDate || compareReleaseDates(candidateDate, record._releaseDate) < 0) {
        record._releaseDate = candidateDate;
      }
      if (record.year === null || candidateDate.year < record.year) {
        record.year = candidateDate.year;
      }
    }

    const genreId = entityIdFromUri(row.genre?.value);
    const genreLabel = validJapaneseLiteral(row.genreLabel);
    if (genreId && !MEDIA_TYPE_IDS.includes(genreId) && genreLabel) {
      record._genres.set(genreId, { id: genreId, label: genreLabel });
    }
  }

  let list = [...records.values()].map(record => {
    const releaseDate = record._releaseDate;
    record.genres = [...record._genres.values()].sort(compareGenres);
    delete record._genres;
    delete record._releaseDate;
    if (includeReleaseDate) {
      return { ...record, releaseDate: releaseDate || null, episodeCount: null };
    }
    return record;
  });

  if (candidateIds) {
    const byId = new Map(list.map(item => [item.source.providerId, item]));
    list = candidateIds.map(id => byId.get(id)).filter(Boolean);
  }
  return list;
}

function makeFacets(items) {
  const genres = new Map();
  for (const item of items) {
    for (const genre of item.genres) genres.set(genre.id, genre);
  }
  return [...genres.values()].sort(compareGenres).slice(0, 30);
}

function makeFacetsFromGenreBindings(bindings) {
  const genres = new Map();
  for (const row of bindings) {
    const genreId = entityIdFromUri(row.genre?.value);
    const genreLabel = validJapaneseLiteral(row.genreLabel);
    if (genreId && !MEDIA_TYPE_IDS.includes(genreId) && genreLabel) {
      genres.set(genreId, { id: genreId, label: genreLabel });
    }
  }
  return [...genres.values()].sort(compareGenres).slice(0, 30);
}

function matchesFilters(item, filters) {
  if (filters.entityType && item.entityType !== filters.entityType) return false;
  if (filters.genreId && !item.genres.some(genre => genre.id === filters.genreId)) return false;
  if (filters.year !== null && item.year !== filters.year) return false;
  return true;
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

async function listAnime(rawParams) {
  const { mode, q, filters: normalized, limit, cursor } = validateListParams(rawParams || {});
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
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

  if (!cursorData && !isFiltered(normalized)) {
    const bindings = await queryRecords({
      candidateIds,
      filters: normalized,
      after: null,
      limit: mode === "browse" ? limit + 1 : candidateIds.length,
      deadline,
    });
    const allItems = recordsFromBindings(bindings, candidateIds);
    const hasMore = mode === "browse" && allItems.length > limit;
    const items = allItems.slice(0, limit);
    const facets = makeFacets(items);
    allowedGenreIds = facets.map(facet => facet.id);
    const nextCursor = mode === "browse"
      ? buildNextCursor({ mode, q, filters: normalized, limit, after: hasMore ? items.at(-1)?.source.providerId : null, allowedGenreIds })
      : buildNextCursor({ mode, q, filters: normalized, limit, continuation: searchNext, allowedGenreIds });
    return { items, page: { limit, nextCursor }, facets: { genres: facets } };
  }

  if (!cursorData && normalized.genreId) {
    if (mode === "search") {
      const baseBindings = await queryRecords({
        candidateIds,
        filters: normalizeFilters({}),
        after: null,
        limit: candidateIds.length,
        deadline,
      });
      const baseItems = recordsFromBindings(baseBindings, candidateIds).slice(0, limit);
      const facets = makeFacets(baseItems);
      allowedGenreIds = facets.map(facet => facet.id);
      if (!allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();
      const items = baseItems.filter(item => matchesFilters(item, normalized));
      const nextCursor = buildNextCursor({
        mode,
        q,
        filters: normalized,
        limit,
        continuation: searchNext,
        allowedGenreIds,
      });
      return { items, page: { limit, nextCursor }, facets: { genres: [] } };
    }

    const idRows = await runSparql(
      buildSparql({ candidateIds: null, filters: normalizeFilters({}), after: null, limit, idsOnly: true }),
      deadline,
    );
    const unfilteredIds = [...new Set(idRows.map(row => entityIdFromUri(row.item?.value)).filter(Boolean))].slice(0, limit);
    if (!unfilteredIds.length) throw invalidRequest();
    const genreRows = await runSparql(buildGenreFacetsSparql(unfilteredIds), deadline);
    allowedGenreIds = makeFacetsFromGenreBindings(genreRows).map(facet => facet.id);
    if (!allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();
  }
  if (normalized.genreId && !allowedGenreIds.includes(normalized.genreId)) throw invalidRequest();

  const bindings = await queryRecords({
    candidateIds,
    filters: normalized,
    after: cursorData?.after || null,
    limit: mode === "browse" ? limit + 1 : candidateIds.length,
    deadline,
  });
  const allItems = recordsFromBindings(bindings, candidateIds);
  const hasMore = mode === "browse" && allItems.length > limit;
  const items = allItems.slice(0, limit);
  const nextCursor = mode === "browse"
    ? buildNextCursor({ mode, q, filters: normalized, limit, after: hasMore ? items.at(-1)?.source.providerId : null, allowedGenreIds })
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
    includeReleaseDate: true,
  });
  return recordsFromBindings(bindings, [qid], { includeReleaseDate: true })[0] || null;
}

module.exports = { ApiError, listAnime, getAnimeDetail, buildSparql, REQUEST_TIMEOUT_MS };
