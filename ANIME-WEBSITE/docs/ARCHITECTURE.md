# Anime Website — Architecture proposal

**Status:** Phase 3 design proposal for owner review; not approved for implementation.

**Baseline:** Vietnamese-first responsive MVP, Japan launch, browse/search/filter/detail, account-synchronized favorites; no ads, paid features, fabricated catalog records, video playback, or watch links. The latest requirements/task board and verification report record Wikidata (`wbsearchentities` plus WDQS) as the selected/approved metadata source and Phase 2 exit. That does not grant image rights or settle all display, caching, and retention practices.

## 1. Proposed system shape

Use a Node.js/Express modular monolith behind one HTTPS origin. Express serves the static UI and `/api/v1/*`, with PostgreSQL on a private connection. A reverse proxy may serve static files separately while preserving same-origin routing. This keeps cookies simple, avoids browser CORS configuration, and leaves fewer operational components than independent frontend/backend services. PostgreSQL is recommended for ownership/uniqueness constraints and transactions; SQLite is a simpler single-process prototype option but is less suitable for concurrent production writes and managed backup. Database product, host, and topology remain proposals for review.

```text
Browser (Vietnamese responsive UI)
  | same-origin HTTPS: /api/v1/*
  v
Node.js + Express
  ├─ validation, auth/session, CSRF, rate limiting
  ├─ catalog service ── Wikidata adapter
  |                     ├─ wbsearchentities: Japanese title candidates
  |                     └─ WDQS: type-qualified fields / bounded browse
  └─ repositories ── PostgreSQL: users, sessions, favorites, expiring auth-token records
```

The UI knows only the project contract. Express owns authorization, input validation, normalization, upstream orchestration, and stable error mapping. Keep a provider adapter boundary even though Wikidata is the selected source: the boundary insulates contract/schema from SPARQL and permits a later reviewed source change. Provider calls and credentials remain server-side.

## 2. Wikidata boundary and catalog behavior

The proposed first-release allowlist is anime television (`Q63952888`, observed in two verified anime-TV samples). It is a useful discriminator, not a complete taxonomy. The reviewed samples do not verify an anime-film class; therefore films and other classes are excluded until independently checked and added by approval. Japanese title search resolves candidate entity IDs; WDQS retrieves supported fields after type qualification. Search candidates alone do not establish that an item is an anime.

Construct SPARQL only from fixed templates and validated QIDs matching `^Q[1-9][0-9]*$`; never interpolate user text or accept arbitrary graph/property identifiers. Apply the anime-TV class allowlist and bounded result limits. Restrict outbound hosts to the configured official Wikidata endpoints. Use bounded timeouts/concurrency and a meaningful project User-Agent/contact in line with current upstream guidance. Do not set a numerical request rate until guidance is rechecked before implementation. WDQS migration, unknown numeric quota/SLO, incomplete Japanese labels/descriptions, and uncertain catalog coverage are explicit operational limits.

Search uses the Japanese Action API to resolve candidate labels/aliases and WDQS to fetch matching type-qualified records. Browse uses a bounded WDQS query for the approved anime-TV type and deterministic QID order; it must not imply popularity or use synthetic seed records. `entityType=anime_tv` is the only proposed structured filter until other types are verified. The general MVP requirement says search/filter; limiting filters this way is a scope tradeoff that requires owner approval. Do not advertise genre/status/year/season/score controls without verified field coverage and agreed semantics.

No persistent catalog table is proposed. Store only users, sessions, favorites (source-qualified QID references), and expiring authentication-token records. Provider results may be held in a bounded in-memory cache only if current upstream guidance and retention are confirmed; cache is disposable, never source-of-truth, and never backed up. No stale-on-error success fallback. A missing entity leaves its favorite reference intact and visible as unavailable; an upstream outage returns an explicit error.

## 3. Identity, normalization, and mapping boundary

Provider ID is the identity boundary. Keep Wikidata QIDs exact internally and validate them before lookup; public `animeId` is an opaque, source-qualified API ID, so clients do not parse or construct QIDs. Do not merge items by title or across sources without explicit evidence. Movie, manga, franchise, season, and TV series remain separate entities.

Normalize only supported facts with provenance: source/provider ID, canonical source URI, server `fetchedAt`, required Japanese `title`, nullable plain-text description, verified entity type, and supported detail fields. A public detail lookup with no Japanese label returns `404 NOT_FOUND`; that is an unavailable record, not a provider failure. Browse/search omit records without a Japanese label. A stored favorite for such an entity returns `availability:"unavailable"`, `anime:null`, and remains removable. A generic Wikidata description is not a synopsis. Keep year/month/day precision, missing values, and unknown classifications distinct; never turn absent numeric fields into zero or guess Vietnamese/Japanese translations. Image URLs are omitted/null unless a separate rights review approves them; no image is copied or proxied. See `DATA_MAPPING.md` for the proposed schema and field rules.

## 4. Accounts and session security proposal

Recommend email/password with Argon2id hashes and opaque server-side sessions in PostgreSQL. Cookies use `Secure`, `HttpOnly`, and `SameSite=Lax`; rotate session IDs at login and password change, revoke on logout/reset, and keep raw session/reset tokens out of the database and logs. For CSRF, derive a session-bound token as `HMAC(serverCsrfKey, rawSessionId || "csrf:v1")`; store only the session ID hash in the database and compare submitted token in constant time after validating the session. `GET /csrf` reissues the same token for the same session and preserves authenticated identity/expiry; it creates an anonymous session only when none is valid. Reloads and multiple tabs therefore do not invalidate one another. Login/re-authentication rotates the session ID, so the browser fetches a new CSRF token afterward; key rotation likewise requires a fresh token. A failed CSRF check returns `403 CSRF_INVALID` without performing or replaying the mutation. Keep the HMAC key in secret storage and out of logs. Rate-limit authentication and recovery; return generic responses that do not reveal account existence. Every favorite query/write is scoped by authenticated user ID.

For account deletion, a verified current account must re-enter its password through login while already authenticated. If credentials match that same account, rotate the session ID and set `authenticated_at` to server time only after password verification. `DELETE /me` requires explicit confirmation and `authenticated_at` no older than a configurable five-minute window (proposed default). If stale/missing, return `403 REAUTH_REQUIRED`; never infer re-authentication from `last_seen_at` or other activity, and never auto-replay deletion after re-auth. Show a confirmation screen and require a deliberate second delete action. Email delivery, verification policy, token lifetimes, recovery UX, deletion/export, retention, and registration policy remain decisions for approval. The contract includes candidate routes, not authorization to collect data or deploy them.

Social login would avoid password handling but introduces an external identity provider, account linking and recovery decisions; no such provider is selected. Persistent server-side sessions are proposed over stateless JWTs because logout/revocation and account deletion are central to the small MVP.

## 5. UI and failure behavior

- Browse/search results use responsive cards/list, with mobile single-column layout and desktop wider grid. Do not label browse as popular or ranked. Detail shows only available verified fields and no player/watch section.
- Loading retains prior search results with progress; empty query is validation, a valid zero-result query is a clear empty state. Cancel stale requests so old results cannot replace the latest query.
- Detail and favorites expose loading, empty, error, and unavailable states. Favorite add/remove disables duplicate actions while pending; failure reverts optimistic UI and announces the result. An unavailable favorite remains removable.
- Anonymous users selecting favorite are sent through sign-in and returned to the intended detail. Account screens use labeled fields, password-manager autocomplete, generic credential errors, and accessible validation.
- Use semantic landmarks/headings, keyboard operation, visible focus, sufficient contrast, reduced-motion support, status announcements, and a WCAG 2.2 AA target for later verification. See `PHASE_3_DESIGN_REVIEW.md` for journeys and acceptance evidence.

Exact breakpoints, browser matrix, and measurable performance/traffic targets remain open. The UI must reflow from narrow mobile to desktop without horizontal page scrolling.

## 6. Deployment, secrets, backup, and restore

Propose one HTTPS Express service plus managed PostgreSQL in a Japan-appropriate region, database on a private network, and provider egress from backend only. This is not a host or region availability claim. A single container with managed database is an alternative with simpler operations and tighter scaling/failure boundaries; separate frontend hosting is another option if same-origin routing remains. Select hosting after agreeing traffic, observability, and targets.

Keep database, session, and email secrets in environment-specific secret storage, not source control, client bundles, image layers, URLs, or logs. Rotate keys and restrict access by environment/role. Public Wikidata endpoints are not expected to need a provider secret; do not generalize this to future adapters. Use redacted structured logs, request IDs, health/readiness checks, graceful shutdown, dependency updates, and alerts without logging raw upstream bodies or personal credentials.

Before release, document encrypted PostgreSQL backup cadence/retention, access controls, and a restore rehearsal in isolated infrastructure. Verify schema version, account/favorite integrity, and application connectivity; record achieved recovery point and time. Cache is excluded. Host support and privacy/retention policy must be known before fixing RPO/RTO.

## 7. Decisions for owner review

Approve/revise modular monolith and same-origin JSON API; PostgreSQL; email/password + server-side sessions; no persistent catalog; anime-TV-only initial allowlist and deterministic browse; proposed `entityType` filter scope; cache policy; and deployment/backup principles. Decide account lifecycle/email verification, registration/recovery/deletion/retention, image policy, supported browsers, host/region, traffic/performance targets, and backup cadence/RPO/RTO. Phase 4 implementation remains unauthorized until the owner separately approves the complete Phase 3 deliverables, Phase 3 exit, and transition.
