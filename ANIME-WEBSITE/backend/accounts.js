const express = require("express");
const crypto = require("node:crypto");
const argon2 = require("argon2");
const { ApiError, getAnimeDetail } = require("./wikidata");
const { recordActivity, deleteOwnAccount } = require("./account-lifecycle");

const hash = value => crypto.createHash("sha256").update(value).digest();
const fail = (status, code) => new ApiError(status, code, "The account request could not be completed.");
const passwordValid = value => typeof value === "string" && value.length >= 12 && Buffer.byteLength(value) <= 256;
const publicUser = row => ({ id: row.id, email: row.email_normalized, emailVerified: false });
function body(req, keys) {
  if (!req.body || Array.isArray(req.body) || typeof req.body !== "object" ||
      Object.keys(req.body).some(key => !keys.includes(key))) throw fail(400, "INVALID_REQUEST");
  return req.body;
}
function credentials(req) {
  const value = body(req, ["email", "password"]);
  if (typeof value.email !== "string" || !passwordValid(value.password)) throw fail(400, "INVALID_REQUEST");
  const email = value.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "INVALID_REQUEST");
  return { email, password: value.password };
}
function animeQid(id) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw fail(400, "INVALID_REQUEST");
  const decoded = Buffer.from(id, "base64url").toString("utf8");
  if (Buffer.from(decoded).toString("base64url") !== id || !/^wikidata:Q[1-9][0-9]*$/.test(decoded)) throw fail(400, "INVALID_REQUEST");
  return decoded.slice(9);
}
const animeId = qid => Buffer.from(`wikidata:${qid}`).toString("base64url");

function createAccounts({ db, secret, secure = true, resolveAnime = getAnimeDetail, authLimit = 10 }) {
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("Account secret must contain at least 32 bytes");
  const router = express.Router();
  const cookieName = secure ? "__Host-anime_session" : "anime_session";
  const cookieOptions = { httpOnly: true, secure, sameSite: "lax", path: "/" };
  const mac = text => crypto.createHmac("sha256", secret).update(text).digest("base64url");
  const csrf = raw => mac(`${raw}csrf:v1`);
  const limits = new Map();
  // shortcut: one-process limiter for the personal trial; use shared counters before multi-instance hosting.
  function rate(req, bucket, maximum, windowMs) {
    const now = Date.now();
    for (const [key, entry] of limits) if (entry.until <= now) limits.delete(key);
    const key = `${bucket}:${req.ip}`;
    let entry = limits.get(key);
    if (!entry) {
      if (limits.size >= 10000) throw new ApiError(429, "RATE_LIMITED", "Try later.", "60");
      entry = { count: 0, until: now + windowMs };
      limits.set(key, entry);
    }
    if (++entry.count > maximum) throw new ApiError(429, "RATE_LIMITED", "Try later.", String(Math.ceil((entry.until - now) / 1000)));
  }
  async function transaction(work) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  async function session(client, userId = null) {
    const raw = crypto.randomBytes(32).toString("base64url");
    const result = await client.query(`INSERT INTO sessions(id_hash,user_id,expires_at,authenticated_at)
      VALUES ($1,$2,statement_timestamp() + $3::interval,CASE WHEN $2::uuid IS NULL THEN NULL ELSE statement_timestamp() END)
      RETURNING expires_at`, [hash(raw), userId, userId ? "30 days" : "1 hour"]);
    return { raw, expires: new Date(result.rows[0].expires_at) };
  }
  function setCookie(res, value) { res.cookie(cookieName, value.raw, { ...cookieOptions, expires: value.expires }); }
  function requireUser(req) { if (!req.account) throw fail(401, "AUTH_REQUIRED"); }
  router.use(async (req, res, next) => {
    try {
      const accountPath = /^\/(csrf|auth|me)(\/|$)/.test(req.path);
      if (accountPath) {
        res.set("Cache-Control", "no-store");
        if (!db) throw fail(503, "SERVICE_UNAVAILABLE");
        if (req.path.startsWith("/auth/")) rate(req, "auth", authLimit, 15 * 60 * 1000);
        else rate(req, "account", 120, 60 * 1000);
      }
      const pairs = (req.headers.cookie || "").split(";").map(part => part.trim().split("="));
      const tokens = pairs.filter(([name]) => name === cookieName).map(([, value]) => value);
      const raw = tokens.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(tokens[0]) ? tokens[0] : null;
      if (db && raw) {
        const found = await db.query(`SELECT s.id_hash,s.user_id,s.authenticated_at,u.id,u.email_normalized
          FROM sessions s LEFT JOIN users u ON u.id=s.user_id
          WHERE s.id_hash=$1 AND s.expires_at>statement_timestamp()`, [hash(raw)]);
        const row = found.rows[0];
        if (row && (!row.user_id || await recordActivity(db, hash(raw)))) {
          req.sessionRaw = raw;
          req.sessionHash = hash(raw);
          req.account = row.user_id ? row : null;
        }
      }
      if (accountPath && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const token = req.get("X-CSRF-Token");
        if (req.get("Sec-Fetch-Site") === "cross-site" || !req.sessionRaw || typeof token !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(token) || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(csrf(req.sessionRaw)))) throw fail(403, "CSRF_INVALID");
      }
      next();
    } catch (error) { next(error); }
  });
  router.get("/csrf", async (req, res) => {
    if (!req.sessionRaw) {
      rate(req, "anonymous", 30, 60 * 1000);
      const value = await session(db);
      setCookie(res, value);
      req.sessionRaw = value.raw;
    }
    res.json({ token: csrf(req.sessionRaw) });
  });
  router.post("/auth/register", async (req, res) => {
    const { email, password } = credentials(req);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await db.query(`INSERT INTO users(id,email_normalized,password_hash) VALUES ($1,$2,$3)
      ON CONFLICT(email_normalized) DO NOTHING`, [crypto.randomUUID(), email, passwordHash]);
    res.status(202).end();
  });
  router.post("/auth/login", async (req, res) => {
    const { email, password } = credentials(req);
    const found = await db.query("SELECT * FROM users WHERE email_normalized=$1", [email]);
    const user = found.rows[0];
    // Hash even an unknown account to avoid a cheap account-existence timing signal.
    const valid = user ? await argon2.verify(user.password_hash, password) : (await argon2.hash(password), false);
    if (!valid || (req.account && req.account.id !== user.id)) throw fail(401, "INVALID_CREDENTIALS");
    const value = await transaction(async client => {
      const renewed = await client.query(`UPDATE users SET last_active_at=statement_timestamp()
        WHERE id=$1 AND password_hash=$2 AND last_active_at>statement_timestamp()-INTERVAL '168 hours' RETURNING id`, [user.id, user.password_hash]);
      if (!renewed.rows.length) throw fail(401, "INVALID_CREDENTIALS");
      await client.query("DELETE FROM sessions WHERE id_hash=$1", [req.sessionHash]);
      return session(client, user.id);
    });
    setCookie(res, value);
    res.json({ user: publicUser(user) });
  });
  router.post("/auth/logout", async (req, res) => {
    requireUser(req);
    await db.query("DELETE FROM sessions WHERE id_hash=$1", [req.sessionHash]);
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });
  router.get("/me", (req, res) => { requireUser(req); res.json({ user: publicUser(req.account) }); });
  router.post("/auth/password", async (req, res) => {
    requireUser(req);
    const { currentPassword, newPassword } = body(req, ["currentPassword", "newPassword"]);
    if (!passwordValid(currentPassword) || !passwordValid(newPassword)) throw fail(400, "INVALID_REQUEST");
    const found = await db.query("SELECT password_hash FROM users WHERE id=$1", [req.account.id]);
    const previous = found.rows[0]?.password_hash;
    if (!previous || !await argon2.verify(previous, currentPassword)) throw fail(401, "INVALID_CREDENTIALS");
    const replacement = await argon2.hash(newPassword, { type: argon2.argon2id });
    const value = await transaction(async client => {
      const changed = await client.query(`UPDATE users SET password_hash=$1,updated_at=statement_timestamp()
        WHERE id=$2 AND password_hash=$3 RETURNING id`, [replacement, req.account.id, previous]);
      if (!changed.rows.length) throw fail(401, "INVALID_CREDENTIALS");
      await client.query("DELETE FROM sessions WHERE user_id=$1", [req.account.id]);
      return session(client, req.account.id);
    });
    setCookie(res, value);
    res.status(204).end();
  });
  router.delete("/me", async (req, res) => {
    requireUser(req);
    if (body(req, ["confirm"]).confirm !== true) throw fail(400, "INVALID_REQUEST");
    if (!await deleteOwnAccount(db, req.sessionHash, true)) throw fail(403, "REAUTH_REQUIRED");
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });
  router.get("/me/export", async (req, res) => {
    requireUser(req);
    const result = await db.query(`SELECT u.id,u.email_normalized,u.created_at,u.last_active_at,
      COALESCE((SELECT json_agg(json_build_object('provider',f.provider,'providerId',f.provider_id,'createdAt',f.created_at))
        FROM favorites f WHERE f.user_id=u.id),'[]'::json) AS favorites FROM users u WHERE u.id=$1`, [req.account.id]);
    if (!result.rows.length) throw fail(401, "AUTH_REQUIRED");
    res.set("Content-Disposition", 'attachment; filename="anime-account.json"').json(result.rows[0]);
  });
  router.put("/me/favorites/:id", async (req, res) => {
    requireUser(req);
    const qid = animeQid(req.params.id);
    const anime = await resolveAnime(req.params.id);
    if (!anime) throw fail(404, "NOT_FOUND");
    const added = await db.query(`INSERT INTO favorites(user_id,provider,provider_id) VALUES ($1,'wikidata',$2)
      ON CONFLICT DO NOTHING RETURNING created_at`, [req.account.id, qid]);
    const row = added.rows[0] || (await db.query("SELECT created_at FROM favorites WHERE user_id=$1 AND provider='wikidata' AND provider_id=$2", [req.account.id, qid])).rows[0];
    res.status(added.rows.length ? 201 : 200).json({ animeId: req.params.id, createdAt: row.created_at, availability: "available", anime });
  });
  router.delete("/me/favorites/:id", async (req, res) => {
    requireUser(req);
    await db.query("DELETE FROM favorites WHERE user_id=$1 AND provider='wikidata' AND provider_id=$2", [req.account.id, animeQid(req.params.id)]);
    res.status(204).end();
  });
  router.get("/me/favorites", async (req, res) => {
    requireUser(req);
    const params = new URL(req.originalUrl, "http://localhost").searchParams;
    if ([...params.keys()].some(k => !["limit", "cursor"].includes(k) || params.getAll(k).length !== 1)) throw fail(400, "INVALID_REQUEST");
    const limitText = params.get("limit") ?? "20";
    const limit = Number(limitText);
    if (!/^\d+$/.test(limitText) || limit < 1 || limit > 20) throw fail(400, "INVALID_REQUEST");
    let position = null;
    if (params.has("cursor")) {
      const token = params.get("cursor");
      if (token.length > 2048) throw fail(400, "INVALID_REQUEST");
      const [encoded, signature, extra] = token.split(".");
      if (!encoded || extra || signature !== mac(`favorites:${encoded}`)) throw fail(400, "INVALID_REQUEST");
      try { position = JSON.parse(Buffer.from(encoded, "base64url").toString()); } catch { throw fail(400, "INVALID_REQUEST"); }
      if (position.user !== req.account.id || position.limit !== limit || typeof position.time !== "string" || !/^Q[1-9][0-9]*$/.test(position.id)) throw fail(400, "INVALID_REQUEST");
    }
    const result = await db.query(`SELECT provider,provider_id,created_at,created_at::text AS page_time FROM favorites
      WHERE user_id=$1 AND ($2::timestamptz IS NULL OR created_at<$2::timestamptz OR
        (created_at=$2::timestamptz AND (provider,provider_id)>($3,$4)))
      ORDER BY created_at DESC,provider,provider_id LIMIT $5`, [req.account.id, position?.time || null, position?.provider || "", position?.id || "", limit + 1]);
    const rows = result.rows.slice(0, limit);
    const deadline = Date.now() + 8000;
    const items = [];
    for (const row of rows) {
      const id = animeId(row.provider_id);
      const anime = await resolveAnime(id, deadline);
      items.push({ animeId: id, createdAt: row.created_at, availability: anime ? "available" : "unavailable", anime });
    }
    let nextCursor = null;
    if (result.rows.length > limit) {
      const row = rows.at(-1);
      const encoded = Buffer.from(JSON.stringify({ user: req.account.id, limit, time: row.page_time, provider: row.provider, id: row.provider_id })).toString("base64url");
      nextCursor = `${encoded}.${mac(`favorites:${encoded}`)}`;
    }
    res.json({ items, page: { limit, nextCursor }, facets: { genres: [] } });
  });
  return router;
}

module.exports = { createAccounts };
