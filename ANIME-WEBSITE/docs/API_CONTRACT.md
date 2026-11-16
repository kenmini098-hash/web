# API contract proposal — `/api/v1`

**Status:** Owner-approved Phase 3 design contract (2026-11-15); Phase 4 public catalog implementation was separately authorized on 2026-11-15. Account endpoints remain design-only pending account lifecycle decisions. Owner selected REST/JSON and approved the current contract, detailed filter semantics, and operational targets. API examples are structural, not live provider records. JSON is UTF-8; timestamps are ISO 8601 UTC. Browser clients call only this API.

**Current account policy:** [ACCOUNT_POLICY.md](ACCOUNT_POLICY.md) supersedes
email-verification gates below for the personal trial. Register/login use
email/password without verification; `emailVerified` remains false. The
candidate verify-email endpoint is excluded. Password recovery is also excluded:
the candidate `/auth/password-reset` and `/auth/password-reset/confirm` routes
below are historical proposals, not implementation targets. Account routes are
implemented with PostgreSQL and available on the local trial. No email service is required for registration/login.

Current implementation defaults: authenticated session 30 days, anonymous session
one hour, passwords at least 12 characters and at most 256 UTF-8 bytes, and ten
auth requests per IP per 15 minutes. `GET /api/v1/me/export` returns a JSON
download of the authenticated user's account fields and favorite references,
without password hashes or session/token secrets. These supersede earlier
pending-account implementation wording below.

## Conventions and resources

- Success list shape: `{ "items": [...], "page": { "limit": 20, "nextCursor": null }, "facets": { "genres": [] } }`. Genre facets appear only on the first unfiltered page (a search query may be present), reflect its bounded candidates, and are not exhaustive. Return at most 30 facets, sorted by Japanese label and then ID; omit counts. On filtered or continued pages return an empty facet list; clients retain facets in page state and refetch the unfiltered first page when opening a filtered URL directly. No total count is promised. Default and maximum limit are 20. Search `q` is trimmed and must contain 1–120 Unicode characters. Cursor is opaque, integrity-protected, and bound to its query/filter or user; invalid/mismatched cursor returns `400`. Reject combined browse mode and search query. Search may return fewer items after type qualification; continuation preserves upstream search position, not the count of qualified items.
- `AnimeSummary`: `{id,title,description,entityType,genres,year,source}`. `id` is an opaque API identifier resolving to the exact provider/entity pair. `title` is a required Japanese label (records without one are omitted from public results). `description` is a nullable generic description, never labeled a synopsis. `entityType` is `anime_tv|anime_film`, mapped from the exact approved candidate classes; exclude an entity with neither or both approved classes. `genres` is a list of `{id,label}` from validated Wikidata `P136` values with Japanese labels; it is incomplete and is not an authoritative taxonomy. `year` is a nullable integer derived by the type-specific rules below. `source` is `{provider,providerId,uri,fetchedAt}`; provider ID is exact Wikidata QID and `fetchedAt` is server retrieval time.
- `AnimeDetail` adds `releaseDate` (`null` or `{year,month,day,precision}`; integer parts nullable, `precision` is `year|month|day|unknown`) and `episodeCount` (nullable non-negative integer) only when the adapter can map verified source statements. TV uses `P580` start time; film uses Japan-qualified `P577` publication date. These optional fields are always present and null when unavailable; never invent precision or use zero for missing episodes. Further fields such as images, ratings, or watch links are not part of this contract. If a valid entity has no Japanese label, direct detail returns `404 NOT_FOUND`, not a provider error.
- `FavoriteItem` is `{animeId,createdAt,availability,anime}` where `availability` is `available|unavailable` and `anime` is `AnimeSummary|null`. Definitive missing/unsupported entity or a record without a Japanese label yields an unavailable favorite; an upstream outage for the list is an API error, not a false unavailable result.
- Wikidata QIDs are not accepted from users as public IDs. The backend decodes/validates its opaque ID and validates QID syntax before provider lookup. Entity identity is never inferred from title equality.

Search/filter exists in the approved MVP baseline. The owner requested TV/film type, genre, and year filters. `entityType` accepts exactly `anime_tv` or `anime_film`; `genreId` must match a validated facet ID returned for the unfiltered first page of the same browse/search query; `year` must be a four-digit integer from 0001 through 9999. Unknown, malformed, or unsupported values return `400 INVALID_REQUEST`. Multiple supplied filters are combined with AND and apply to both browse and search before page limiting. Anime TV year uses the earliest valid `P580` start time; anime-film year uses the earliest `P577` publication date qualified with `P291=Q17` (Japan). Derive only when source precision is year or better; missing or less precise dates do not match. Genre candidates come from `P136`; expose a value only when its entity has `P31=Q201658` or `P31=Q4178140` and a Japanese label. Facets are bounded and non-exhaustive, so the UI must not imply that omitted genres are absent. Additional filters (status, season, score) remain out of scope.

## Endpoints

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `GET /healthz` | No | Liveness only; no dependency status or secrets. |
| `GET /api/v1/csrf` | No | Return `{token}` for the current session. Create an anonymous session only when no valid session exists; for an authenticated session preserve its user binding and expiry. Reissue the same token for that session (safe for concurrent tabs); login/re-auth rotates the session so fetch a new token. |
| `GET /api/v1/anime?mode=browse&entityType={anime_tv|anime_film}&genreId={QID}&year={YYYY}&limit={n}&cursor={opaque}` | No | Bounded WDQS browse restricted to exact approved TV/film classes, ordered deterministically by QID. No popularity/editorial ranking. Optional filters are conjunctive and applied before page limiting. |
| `GET /api/v1/anime?q={text}&entityType={anime_tv|anime_film}&genreId={QID}&year={YYYY}&limit={n}&cursor={opaque}` | No | Japanese title search via `wbsearchentities`, then type-qualified WDQS fields and filters. `q` required unless `mode=browse`; filters optional. |
| `GET /api/v1/anime/{id}` | No | Resolve one opaque ID; `404 NOT_FOUND` if absent, unsupported type, or no Japanese label. Missing label is unavailable data, not a provider error. |
| `POST /api/v1/auth/register` | No | Candidate registration body `{email,password}`; generic `202`. Do not launch open registration until email verification, abuse controls and recovery are approved. |
| `POST /api/v1/auth/verify-email` | No | Candidate one-time verification token exchange. |
| `POST /api/v1/auth/login` | No | Body `{email,password}`; success sets secure session cookie and returns `{user}`. When an authenticated session exists, re-authentication succeeds only for that same verified user; it rotates the session and records `authenticated_at` after password verification. An anonymous/expired session may log in normally. Generic failure response. |
| `POST /api/v1/auth/logout` | Yes | Revoke current session and clear cookie. |
| `POST /api/v1/auth/password-reset` | No | Candidate generic `202` reset request; does not reveal account existence. |
| `POST /api/v1/auth/password-reset/confirm` | No | Candidate one-time token + new password; consume atomically and revoke all sessions. |
| `POST /api/v1/auth/password` | Yes | Candidate password change; require current password/recent re-authentication and revoke other sessions. |
| `GET /api/v1/me` | Yes | Return account ID and verification state. |
| `GET /api/v1/me/favorites?limit={n}&cursor={opaque}` | Yes | List favorites with best-effort current metadata. Stable keyset cursor order `(createdAt DESC, provider, providerId)`, scoped to user. |
| `PUT /api/v1/me/favorites/{animeId}` | Yes | Idempotently add favorite. `201` first creation, `200` if already exists. Accept only an opaque ID resolving to an approved anime-TV or anime-film entity with a Japanese label; otherwise return 404. |
| `DELETE /api/v1/me/favorites/{animeId}` | Yes | Remove only caller's favorite; idempotent `204`. |
| `DELETE /api/v1/me` | Yes | Candidate body `{"confirm":true}`. Requires verified current account and `authenticated_at` within proposed configurable 5-minute window; cascade user data under approved retention policy. |

All mutations, including login/register/reset, require the CSRF token. Token is derived as `HMAC(serverCsrfKey, rawSessionId || "csrf:v1")`; database stores only the session ID hash, not a CSRF token hash. `GET /api/v1/csrf` preserves a valid session's identity and expiry; it creates an anonymous session only when none is valid. The same session reissues the same token so multiple tabs remain valid. Session ID rotation at login/re-authentication and password changes invalidates the old token; client calls `GET /api/v1/csrf` to obtain the new one. Invalid/missing token returns `403 CSRF_INVALID`, performs no mutation, and must not trigger automatic replay. Email delivery, token lifetimes, confirmation UX, account deletion/export, and registration policy require owner approval before implementation.

## Candidate request and success payloads

All successful `GET` responses return `200`. The endpoints below use the shared list shape for browse/search and favorites, and the resources defined above for detail. Candidate account responses are intentionally generic where account existence must not be disclosed:

| Operation | Request body | Success response |
| --- | --- | --- |
| `GET /healthz` | None | `200 {"status":"ok"}`; liveness only. |
| `GET /api/v1/csrf` | None | `200 {"token":"<opaque-token>"}`. |
| `GET /api/v1/anime` browse/search | None | `200` list response: `items: AnimeSummary[]`; `page.limit` is the effective request limit, `page.nextCursor` is an opaque cursor or `null`, and `facets.genres` lists validated Japanese genre values found in the unfiltered first-page candidates. |
| `GET /api/v1/anime/{id}` | None | `200 AnimeDetail`. |
| `POST /api/v1/auth/register` | `{"email":"...","password":"..."}` | `202` with an empty body; UI displays the same generic next-step message for every accepted request. |
| `POST /api/v1/auth/verify-email` | `{"token":"..."}` | `204` with an empty body. |
| `POST /api/v1/auth/login` | `{"email":"...","password":"..."}` | `200 {"user":{"id":"<uuid>","email":"...","emailVerified":false}}` and sets the session cookie. |
| `POST /api/v1/auth/logout` | None | `204` with an empty body and clears the session cookie. |
| `POST /api/v1/auth/password-reset` | `{"email":"..."}` | `202` with an empty body, whether or not an account exists. |
| `POST /api/v1/auth/password-reset/confirm` | `{"token":"...","newPassword":"..."}` | `204` with an empty body. |
| `POST /api/v1/auth/password` | `{"currentPassword":"...","newPassword":"..."}` | `204` with an empty body. |
| `GET /api/v1/me` | None | `200 {"user":{"id":"<uuid>","email":"...","emailVerified":false}}`. |
| `GET /api/v1/me/favorites` | None | `200` list response: `items: FavoriteItem[]`; `page.limit` is the effective request limit and `page.nextCursor` is an opaque cursor or `null`. |
| `PUT /api/v1/me/favorites/{animeId}` | None | `201 FavoriteItem` when created; `200 FavoriteItem` when already present. |
| `DELETE /api/v1/me/favorites/{animeId}` | None | `204` with an empty body. |
| `DELETE /api/v1/me` | `{"confirm":true}` | `204` with an empty body after the proposed hard delete and cascades; requires recent re-authentication or returns `403 REAUTH_REQUIRED`. |

These account payloads and status codes complete the Phase 3 proposal; registration, verification, recovery, deletion, and retention behavior still require owner approval. All error responses use the error envelope below. Invalid or expired one-time tokens use `400 INVALID_REQUEST`; no token value is echoed.

## Approved lifecycle amendment — 2026-11-15

The owner approved activity tracking and seven-day inactivity deletion using
`users.last_active_at`, initialized at creation and renewed on successful login
or authenticated API use. Voluntary deletion retains explicit confirmation,
CSRF and password reauthentication within five minutes. Account deletion cascades
favorites, sessions and auth tokens. The database layer is implemented; account
HTTP routes are not exposed yet. Remaining email/token policy choices are open.

## Errors and client behavior

Errors use `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`. UI supplies Vietnamese copy; API never returns stack traces, SQL, raw upstream body, secrets, or credentials.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid query, ID, body, filter, or cursor. |
| 401 | `AUTH_REQUIRED` / `INVALID_CREDENTIALS` | Sign in or show generic credential failure; do not reveal account existence. |
| 403 | `FORBIDDEN` / `CSRF_INVALID` / `REAUTH_REQUIRED` | Action not allowed, CSRF token invalid, or password verification is outside the deletion confirmation window. `CSRF_INVALID` never performs a mutation; show a clear error and require the user to retry explicitly after refreshing the token. `REAUTH_REQUIRED` prompts login again for the same verified current account; after session rotation, fetch CSRF token and ask for explicit deletion confirmation again. Do not auto-replay. |
| 404 | `NOT_FOUND` | Entity absent/unsupported or lacks Japanese label. A stored favorite instead returns `FavoriteItem` with unavailable state. |
| 409 | `ACCOUNT_CONFLICT` | Safe-to-disclose account conflict; otherwise keep generic registration response. |
| 429 | `RATE_LIMITED` | Respect `Retry-After`. |
| 502 | `PROVIDER_UNAVAILABLE` | Malformed provider response or upstream failure. |
| 503 | `SERVICE_UNAVAILABLE` | Local dependency unavailable. |
| 504 | `PROVIDER_TIMEOUT` | Upstream deadline elapsed. |

Retry safe GETs at most once with jitter if the deadline permits; never retry auth/favorite mutations automatically. Preserve upstream `Retry-After`. Loading retains previous results; cancel stale search requests. Empty valid search has a distinct empty state; blank query is validation. Provider failure offers retry and never returns fake results. Favorite optimistic changes revert on failure with an accessible announcement. A source outage while resolving a favorites page returns an error; a definitive per-item 404, including no Japanese label, marks only that favorite unavailable.
