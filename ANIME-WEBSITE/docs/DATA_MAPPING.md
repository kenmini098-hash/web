# Data mapping proposal

**Status:** Owner-approved Phase 3 design schema (2026-11-15); Phase 4 public catalog implementation was separately authorized on 2026-11-15. PostgreSQL is the owner-selected database. Account/favorite persistence remains blocked pending account lifecycle decisions. Consistent with `ARCHITECTURE.md` and `API_CONTRACT.md`. The owner requested anime-TV and anime-film catalog entries with genre/year filters. Wikidata sample evidence supports these proposed fields/classes but does not establish catalog completeness or operational SLO.

**Current account policy:** [ACCOUNT_POLICY.md](ACCOUNT_POLICY.md) supersedes
email-verification requirements below. `email_verified_at` remains null and
does not restrict account use. `verification_tokens` is retained but unused.
Password recovery is excluded. `password_reset_tokens` is also retained but
unused; the reset flow below is a historical proposal, not an implementation task.

## 1. Source mapping and safe resolution

| Project input/field | Wikidata source | Mapping and absence behavior |
| --- | --- | --- |
| Japanese search text | Action API `wbsearchentities` `search` | Trim, require 1–120 Unicode characters, request `language=ja`, `uselang=ja`, `type=item`; cap results at 20. Search hits are candidates, not verified anime records. |
| Entity type | `P31` / `instance of` in WDQS | Exact candidate allowlist: anime television `Q63952888` and anime film `Q20650540`, each observed in multiple live Japanese examples. Include only if exactly one allowlisted class is present; exclude if neither or both are present. Other classes do not substitute for the allowlist. These IDs are not a complete taxonomy. |
| QID | Entity identifier | Preserve exact QID internally; validate `^Q[1-9][0-9]*$`. Public `animeId` is opaque and maps to `{provider:"wikidata",providerId:QID}`. Never build IDs from titles. |
| `title` | Japanese label | Required for a public result. If no Japanese label exists, omit it from browse/search and return `404 NOT_FOUND` for direct detail. A pre-existing favorite remains as `availability:"unavailable"`, `anime:null`; this is not an upstream/provider error. Never guess a translation or display a QID as title. |
| `description` | Japanese entity description | Nullable generic description. Do not call it a synopsis. |
| `entityType` | Verified `P31` class | Map `Q63952888` to `anime_tv` and `Q20650540` to `anime_film`; exclude entities with neither or both allowlisted classes from catalog and favorite creation. |
| `genres` | `P136` (`genre`) links to Wikidata genre entities | Include only category entities validated as `P31` film genre (`Q201658`) or anime/manga genre (`Q4178140`), with a Japanese label; exclude media type IDs even if incorrectly linked as genre. Deduplicate by QID; absence is not proof that no genre exists. |
| `year` | Type-specific date properties | TV uses the earliest valid `P580` start time. Film uses the earliest valid `P577` publication date only when qualified with `P291=Q17` (Japan). Derive an integer year only at year-or-better precision. Null if no qualifying statement exists. |
| `source.provider` | Application constant | `wikidata`. |
| `source.providerId` | QID | Exact validated QID. |
| `source.uri` | Canonical Wikidata entity URI | Construct only from validated QID; never accept a user-supplied URL. |
| `source.fetchedAt` | Application clock | UTC time data was fetched; not source update time. |
| `releaseDate`, `episodeCount` | WDQS properties only if verified/mapped | Optional detail fields: TV release/start date uses `P580`; film date uses Japan-qualified `P577` (`P291=Q17`). Return null when absent/unverified; preserve date precision; episode count zero only when source explicitly says zero. Do not imply availability across the catalog. |

No score, image, external watch link, video URL, or synopsis is exposed. Structured-data reuse approval does not grant artwork or video rights.

## 2. Provider query and response handling

- Search Japanese text through `wbsearchentities`, then retrieve only candidates with an allowlisted `P31` class and required Japanese label. Do not infer type from a title, alias, or description.
- Browse is a bounded WDQS query for the allowlisted TV/film classes, ordered by QID for deterministic continuation. Do not sort by unsupported popularity or fabricate seed records. Pagination uses opaque continuation state; no total is claimed.
- Generate SPARQL from fixed templates. Validate QIDs before binding; never interpolate free text, property IDs, or caller-supplied URLs. Cap result count and expected response size.
- Require valid result bindings and verify each returned entity URI matches the requested QID. Ignore unexpected rows; malformed data/transport errors/timeouts become provider errors, not empty success.
- Genre facets are derived only from the first unfiltered bounded candidate page for the same browse/search query, after validating genre entity class and Japanese label. Return at most 30, sorted by Japanese label then QID; facets are non-exhaustive and may vary by query. A `genreId` filter accepts only an ID exposed by that facet response. Clients hold facets in page state and refetch the unfiltered first page when opening a filtered URL directly; no server-side or persistent catalog/facet cache is allowed.
- Filters apply to browse and search before page limiting and combine with AND. `entityType` accepts only `anime_tv` or `anime_film`; `genreId` must be a validated facet of the same query; `year` is a four-digit integer from 0001–9999. Invalid or unsupported filter values return `400 INVALID_REQUEST`.
- Year filtering is type-specific: TV uses the earliest valid `P580` start year; film uses the earliest valid Japan-qualified `P577`/`P291=Q17` year. Unqualified film dates do not match; missing or less-than-year precision dates are excluded. A year filter without `entityType` matches records of either type using that type's rule.
- WDQS migration, absent verified numeric quota/SLO, and incomplete language/catalog coverage remain dependencies to recheck before integration acceptance and release.

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
5. Favorites `PUT` validates opaque ID -> QID, verifies it resolves to an allowlisted anime-TV or anime-film entity with a Japanese label, then inserts under authenticated user. Unique conflict is idempotent success. `DELETE` scopes both user ID and QID. Listing orders by `(created_at DESC,provider,provider_id)` and resolves metadata server-side.
6. Account deletion requires a verified current user, explicit confirmation, and `authenticated_at` no older than a configurable five-minute window (proposed default). If expired/missing, return `403 REAUTH_REQUIRED`; user logs in again as the same account and must confirm deletion again. Never infer freshness from `last_seen_at` or auto-replay the deletion. Then cascade sessions/favorites/tokens under an owner-approved retention policy. Export/retention timelines remain open.

## Approved lifecycle amendment — 2026-11-15

The owner approved the activity definition and schema change: add indexed
`users.last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.
Creation starts the clock; successful login or authenticated API use renews it.
Accounts have no fixed lifetime, but after 168 hours without activity they and
their dependent sessions, favorites and auth tokens are deleted. Users may also
delete their accounts after password reauthentication and explicit confirmation.
This supersedes the pending-approval wording below for these specific decisions.

The SQL migration, session-scoped lifecycle helpers and bounded cleanup command
are implemented. Account HTTP/UI integration, email and remaining token policy
decisions are still pending. No production cleanup schedule is enabled.

## 5. Cache, retention, backup

The owner selected no catalog cache. Do not persist or cache catalog data. Keep user account/session/favorite data retention minimal and define expiry/deletion before production. Target encrypted nightly PostgreSQL backups with seven daily restore points, RPO <= 24 hours, RTO <= 8 hours, and quarterly plus pre-release isolated restore rehearsals. Restrict access and record achieved recovery time/point. The host must support these targets; vendor selection is deferred to implementation planning.

## Owner clarification ? 2026-11-15

The owner specified permanent account lifetime and authorized continuing Phase 4 through acceptance preparation. The owner subsequently clarified: accounts have no fixed end date, users may delete their accounts at any time, and accounts inactive for one week must be deleted. This supersedes the initial no-inactivity-deletion interpretation. The activity definition and proposed last_active_at schema addition await approval; no automatic deletion job is enabled. This does not define session/reset-token expiry. Email verification, recovery, export, session/token lifetimes, mail delivery and abuse-control policies remain pending explicit owner clarification. No Phase 5 transition is authorized.
