# API contract proposal — `/api/v1`

**Status:** Phase 3 draft; not approved for implementation. API examples are structural, not live provider records. JSON is UTF-8; timestamps are ISO 8601 UTC. Browser clients call only this API.

## Conventions and resources

- Success list shape: `{ "items": [...], "page": { "limit": 20, "nextCursor": null } }`. No total count is promised. Default and maximum limit are 20. Search `q` is trimmed and must contain 1–120 Unicode characters. Cursor is opaque, integrity-protected, and bound to its query/filter or user; invalid/mismatched cursor returns `400`. Reject combined browse mode and search query. Search may return fewer items after type qualification; continuation preserves upstream search position, not the count of qualified items.
- `AnimeSummary`: `{id,title,description,entityType,source}`. `id` is an opaque API identifier resolving to the exact provider/entity pair. `title` is a required Japanese label (records without one are omitted from public results). `description` is a nullable generic description, never labeled a synopsis. `entityType` is the normalized enum `anime_tv` for records in this proposal. `source` is `{provider,providerId,uri,fetchedAt}`; provider ID is exact Wikidata QID and `fetchedAt` is server retrieval time.
- `AnimeDetail` adds `releaseDate` (`null` or `{year,month,day,precision}`; integer parts nullable, `precision` is `year|month|day|unknown`) and `episodeCount` (nullable non-negative integer) only when the adapter can map verified source statements. These optional metadata fields are always present and null when unavailable; never invent precision or use zero for missing episodes. Further fields such as images, ratings, genres, or watch links are not part of this contract until separately verified/approved.
- `FavoriteItem` is `{animeId,createdAt,availability,anime}` where `availability` is `available|unavailable` and `anime` is `AnimeSummary|null`. Definitive missing/unsupported entity yields an unavailable favorite; an upstream outage for the list is an API error, not a false unavailable result.
- Wikidata QIDs are not accepted from users as public IDs. The backend decodes/validates its opaque ID and validates QID syntax before provider lookup. Entity identity is never inferred from title equality.

Search/filter exists in the approved MVP baseline. This proposal supports Japanese text search and an optional `entityType=anime_tv` constraint. Other content-type filters are omitted because the reviewed evidence verifies anime-TV class examples only; genre/status/season/year/score filters are deferred. The narrower filter scope is a proposal tradeoff and requires owner approval, not a silent change to baseline.

## Endpoints

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `GET /healthz` | No | Liveness only; no dependency status or secrets. |
| `GET /api/v1/csrf` | No | Create/refresh an anonymous session-bound synchronizer token; return `{token}`. Browser holds it in memory and sends `X-CSRF-Token` on every mutation. |
| `GET /api/v1/anime?mode=browse&limit={n}&cursor={opaque}` | No | Bounded WDQS browse restricted to approved anime-TV class, ordered deterministically by QID. No popularity/editorial ranking. |
| `GET /api/v1/anime?q={text}&entityType=anime_tv&limit={n}&cursor={opaque}` | No | Japanese title search via `wbsearchentities`, then type-qualified WDQS fields. `q` required unless `mode=browse`; `entityType` optional and only supported value is `anime_tv`. |
| `GET /api/v1/anime/{id}` | No | Resolve one opaque ID; `404` if absent or not in the approved supported type. |
| `POST /api/v1/auth/register` | No | Candidate registration body `{email,password}`; generic `202`. Do not launch open registration until email verification, abuse controls and recovery are approved. |
| `POST /api/v1/auth/verify-email` | No | Candidate one-time verification token exchange. |
| `POST /api/v1/auth/login` | No | Body `{email,password}`; success sets secure session cookie and returns `{user}`. Generic failure response. |
| `POST /api/v1/auth/logout` | Yes | Revoke current session and clear cookie. |
| `POST /api/v1/auth/password-reset` | No | Candidate generic `202` reset request; does not reveal account existence. |
| `POST /api/v1/auth/password-reset/confirm` | No | Candidate one-time token + new password; consume atomically and revoke all sessions. |
| `POST /api/v1/auth/password` | Yes | Candidate password change; require current password/recent re-authentication and revoke other sessions. |
| `GET /api/v1/me` | Yes | Return account ID and verification state. |
| `GET /api/v1/me/favorites?limit={n}&cursor={opaque}` | Yes | List favorites with best-effort current metadata. Stable keyset cursor order `(createdAt DESC, provider, providerId)`, scoped to user. |
| `PUT /api/v1/me/favorites/{animeId}` | Yes | Idempotently add favorite. `201` first creation, `200` if already exists. Accept only a valid opaque ID resolving to approved anime-TV entity. |
| `DELETE /api/v1/me/favorites/{animeId}` | Yes | Remove only caller's favorite; idempotent `204`. |
| `DELETE /api/v1/me` | Yes | Candidate account deletion after recent re-authentication; cascade user data under approved retention policy. |

All mutations, including login/register/reset, require the CSRF token. Session ID rotates at authentication and password changes. Email delivery, token lifetimes, confirmation UX, account deletion/export, and registration policy require owner approval before implementation.

## Errors and client behavior

Errors use `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`. UI supplies Vietnamese copy; API never returns stack traces, SQL, raw upstream body, secrets, or credentials.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid query, ID, body, filter, cursor, or CSRF token. |
| 401 | `AUTH_REQUIRED` / `INVALID_CREDENTIALS` | Sign in or show generic credential failure; do not reveal account existence. |
| 403 | `FORBIDDEN` | Authenticated but action is not allowed. |
| 404 | `NOT_FOUND` | Entity absent/unsupported. A stored favorite instead returns `FavoriteItem` with unavailable state. |
| 409 | `ACCOUNT_CONFLICT` | Safe-to-disclose account conflict; otherwise keep generic registration response. |
| 429 | `RATE_LIMITED` | Respect `Retry-After`. |
| 502 | `PROVIDER_UNAVAILABLE` | Malformed provider response or upstream failure. |
| 503 | `SERVICE_UNAVAILABLE` | Local dependency unavailable. |
| 504 | `PROVIDER_TIMEOUT` | Upstream deadline elapsed. |

Retry safe GETs at most once with jitter if the deadline permits; never retry auth/favorite mutations automatically. Preserve upstream `Retry-After`. Loading retains previous results; cancel stale search requests. Empty valid search has a distinct empty state; blank query is validation. Provider failure offers retry and never returns fake results. Favorite optimistic changes revert on failure with an accessible announcement. A source outage while resolving a favorites page returns an error; a definitive per-item 404 marks only that favorite unavailable.
