const express = require("express");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { ApiError, listAnime, getAnimeDetail } = require("./wikidata");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");
const port = Number.parseInt(process.env.PORT || "3000", 10);
const allowedQuery = new Set(["mode", "q", "entityType", "genreId", "year", "limit", "cursor"]);

app.disable("x-powered-by");
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set("Content-Security-Policy", "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'");
  next();
});

function fail(status, code, message, retryAfter = null) {
  return new ApiError(status, code, message, retryAfter);
}

function readSingle(params, key) {
  const values = params.getAll(key);
  if (values.length > 1) throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  return values[0] ?? null;
}

function parseAnimeQuery(req) {
  if (req.originalUrl.length > 8192) throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  const url = new URL(req.originalUrl, "http://localhost");
  for (const key of url.searchParams.keys()) {
    if (!allowedQuery.has(key)) throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const params = url.searchParams;
  const modeValue = readSingle(params, "mode");
  const qValue = readSingle(params, "q");
  const q = qValue === null ? null : qValue.trim();
  if (modeValue && modeValue !== "browse") throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  if (modeValue === "browse" && q) throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  if (qValue !== null && (Array.from(q).length < 1 || Array.from(q).length > 120)) {
    throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const mode = q ? "search" : "browse";

  const entityType = readSingle(params, "entityType");
  if (entityType && !["anime_tv", "anime_film"].includes(entityType)) {
    throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const genreId = readSingle(params, "genreId");
  if (genreId && !/^Q[1-9][0-9]*$/.test(genreId)) {
    throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const yearText = readSingle(params, "year");
  if (yearText !== null && (!/^\d{4}$/.test(yearText) || Number(yearText) < 1 || Number(yearText) > 9999)) {
    throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const limitText = readSingle(params, "limit");
  const limit = limitText === null ? 20 : Number(limitText);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw fail(400, "INVALID_REQUEST", "The request is invalid.");
  }
  const cursor = readSingle(params, "cursor");
  return {
    mode,
    q,
    filters: { entityType, genreId, year: yearText === null ? null : Number(yearText) },
    limit,
    cursor,
  };
}

function sendError(res, error, requestId) {
  const known = error instanceof ApiError ? error : new ApiError(503, "SERVICE_UNAVAILABLE", "The request could not be completed.");
  if (known.retryAfter) res.set("Retry-After", known.retryAfter);
  return res.status(known.status).json({
    error: { code: known.code, message: known.message, requestId },
  });
}

app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));

app.get("/api/v1/anime", async (req, res) => {
  try {
    const params = parseAnimeQuery(req);
    res.status(200).json(await listAnime(params));
  } catch (error) {
    sendError(res, error, req.requestId);
  }
});

app.get("/api/v1/anime/:id", async (req, res) => {
  try {
    const anime = await getAnimeDetail(req.params.id);
    if (!anime) return sendError(res, new ApiError(404, "NOT_FOUND", "Anime record not found."), req.requestId);
    return res.status(200).json(anime);
  } catch (error) {
    return sendError(res, error, req.requestId);
  }
});

app.use("/api", (req, res) => sendError(res, new ApiError(404, "NOT_FOUND", "Endpoint not found."), req.requestId));
app.use(express.static(frontendPath));

app.listen(port, process.env.HOST || "127.0.0.1", () => {
  process.stdout.write(`Anime Website listening on http://${process.env.HOST || "127.0.0.1"}:${port}\n`);
});
