# Data mapping proposal

**Status:** Phase 3 draft for review; PostgreSQL/schema not approved for implementation. Consistent with `ARCHITECTURE.md` and `API_CONTRACT.md`. Wikidata is the source recorded as approved by the owner, but evidence supports only sample anime-TV records and does not establish catalog completeness or operational SLO.

## 1. Source mapping and safe resolution

| Project input/field | Wikidata source | Mapping and absence behavior |
| --- | --- | --- |
| Japanese search text | Action API `wbsearchentities` `search` | Trim, require 1–120 Unicode characters, request `language=ja`, `uselang=ja`, `type=item`; cap results at 20. Search hits are candidates, not verified anime records. |
| Entity type | `P31` / `instance of` in WDQS | Initial allowlist is anime television `Q63952888`, observed in two verified examples. Exclude films, manga, franchises, seasons, and unverified classes. This is a limited first-release proposal, pending owner approval. |
| QID | Entity identifier | Preserve exact QID internally; validate `^Q[1-9][0-9]*$`. Public `animeId` is opaque and maps to `{provider:"wikidata",providerId:QID}`. Never build IDs from titles. |
| `title` | Japanese label | Required for a public result. If no Japanese label exists, omit it from browse/search and return `404 NOT_FOUND` for direct detail. A pre-existing favorite remains as `availability:"unavailable"`, `anime:null`; this is not an upstream/provider error. Never guess a translation or display a QID as title. |
| `description` | Japanese entity description | Nullable generic description. Do not call it a synopsis. |
| `entityType` | Verified `P31` class | Map only allowlisted anime-TV entity to `anime_tv`; unsupported/ambiguous class is excluded from catalog and favorite creation. |
| `source.provider` | Application constant | `wikidata`. |
| `source.providerId` | QID | Exact validated QID. |
| `source.uri` | Canonical Wikidata entity URI | Construct only from validated QID; never accept a user-supplied URL. |
| `source.fetchedAt` | Application clock | UTC time data was fetched; not source update time. |
| `releaseDate`, `episodeCount` | WDQS properties only if verified/mapped | Optional contract extensions: return null when absent or unverified; preserve date precision; episode count zero only when source explicitly says zero. Do not imply availability across the catalog. |

No score, image, genre, external watch link, video URL, or synopsis is exposed. Structured-data reuse approval does not grant artwork or video rights.

## 2. Provider query and response handling

- Search Japanese text through `wbsearchentities`, then retrieve only candidates with the approved anime-TV class and required Japanese label. Do not infer type from a title, alias, or description.
- Browse is a bounded WDQS query for the allowlisted class, ordered by QID for deterministic continuation. Do not sort by unsupported popularity or fabricate seed records. Pagination uses opaque continuation state; no total is claimed.
- Generate SPARQL from fixed templates. Validate QIDs before binding; never interpolate free text, property IDs, or caller-supplied URLs. Cap result count and expected response size.
- Require valid result bindings and verify each returned entity URI matches the requested QID. Ignore unexpected rows; malformed data/transport errors/timeouts become provider errors, not empty success.
- WDQS migration, absent verified numeric quota/SLO, and incomplete language/catalog coverage remain dependencies to recheck before Phase 4.

## 3. Proposed PostgreSQL schema

No `anime` catalog table is proposed. Use migrations, parameterized queries, foreign keys, uniqueness constraints, and transactional account/session changes.

| Table | Columns / constraints | Purpose and handling |
| --- | --- | --- |
| `users` | `id UUID PRIMARY KEY` (application-generated); `email_normalized VARCHAR(254) NOT NULL UNIQUE`; `password_hash TEXT NOT NULL`; `email_verified_at TIMESTAMPTZ NULL`; `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | Store normalized email and Argon2id encoded hash, never plaintext/reversible password. Proposed deletion is hard delete with dependent rows cascaded; retention/legal requirements need approval before implementation. |
| `sessions` | `id_hash BYTEA PRIMARY KEY`; `user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE`; `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; `expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)`; `authenticated_at TIMESTAMPTZ NULL` | Nullable user supports pre-auth session. Store only hash of random session ID. Set `authenticated_at` to server time only after successful password verification; never derive it from `last_seen_at` or other activity. Index `expires_at` and `user_id`. |
| `favorites` | `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`; `provider TEXT NOT NULL`; `provider_id TEXT NOT NULL`; `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; `PRIMARY KEY(user_id,provider,provider_id)` | User-owned reference only; provider-qualified ID prevents collision. Index `(user_id,created_at DESC,provider,provider_id)` for stable list cursor. |
| `verification_tokens` | `token_hash BYTEA PRIMARY KEY`; `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`; `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; `expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)`; `consumed_at TIMESTAMPTZ NULL` | Candidate one-time email verification token; persist hash only, consume atomically, expire/delete. Add an index on `(user_id,expires_at)`. |
| `password_reset_tokens` | `token_hash BYTEA PRIMARY KEY`; `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`; `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; `expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)`; `consumed_at TIMESTAMPTZ NULL` | Candidate one-time reset token; persist hash only, consume atomically, revoke all sessions on reset. Add an index on `(user_id,expires_at)`. |

Favorites store no title/description/image. If current metadata lookup definitively returns 404, return `FavoriteItem` with `availability:"unavailable"` and `anime:null`; do not delete the favorite. If provider is unavailable, fail the list request explicitly rather than mark all entries unavailable. No provider response or cache belongs in database backups.

## 4. Account and favorites flow mapping

1. `GET /api/v1/csrf` validates an existing session or creates an anonymous session only if none is valid, then returns `HMAC(serverCsrfKey, rawSessionId || "csrf:v1")`. It must preserve an authenticated session's user binding and expiry. Verify the request session by its database hash before deriving/constant-time comparing the token. The HMAC key is in secret storage; no CSRF token/hash is persisted. Re-fetching within the same session returns the same token so multiple tabs/reloads work; session ID rotation invalidates the old token, after which the client fetches the new one.
2. Registration normalizes email, rate-limits, hashes password, creates account and candidate verification token in a transaction. Return generic `202`; email delivery, verification requirement and token TTL need approval before implementation.
3. Login uses generic failure response, verifies password, rotates the session ID, and creates a server-side authenticated session with `authenticated_at=now()` set only after successful password verification. Cookie is `Secure; HttpOnly; SameSite=Lax`. If an authenticated session already exists, re-login must match that same verified current user; an anonymous/expired session may log in normally. Re-login rotates the ID and refreshes `authenticated_at`. Login, reset and password change are rate-limited.
4. Password reset request returns generic `202`; confirmation consumes one valid token atomically, changes the hash, and revokes all sessions. Token expiry/length, mail service, and confirmation UX require approval.
5. Favorites `PUT` validates opaque ID -> QID, verifies it resolves to allowlisted anime-TV, then inserts under authenticated user. Unique conflict is idempotent success. `DELETE` scopes both user ID and QID. Listing orders by `(created_at DESC,provider,provider_id)` and resolves metadata server-side.
6. Account deletion requires a verified current user, explicit confirmation, and `authenticated_at` no older than a configurable five-minute window (proposed default). If expired/missing, return `403 REAUTH_REQUIRED`; user logs in again as the same account and must confirm deletion again. Never infer freshness from `last_seen_at` or auto-replay the deletion. Then cascade sessions/favorites/tokens under an owner-approved retention policy. Export/retention timelines remain open.

## 5. Cache, retention, backup

Do not persist catalog data. Optional short-lived in-memory cache requires confirmation of current upstream guidance and owner approval; it is bounded, disposable, contains no third-party artwork, and has no stale-on-error fallback. Keep user account/session/favorite data retention minimal and define expiry/deletion before production. Encrypt PostgreSQL backups, restrict access, document cadence/retention after host selection, and rehearse isolated restore before release; record actual recovery time/point. Exact RPO/RTO remain open.
