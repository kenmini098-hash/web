# Anime Website — Architecture proposal

**Status:** Architecture, API contract, database schema, and Phase 3 exit approved on 2026-11-15. Phase 4 was separately authorized on 2026-11-15 for the public catalog slice. Account lifecycle decisions block account/favorite implementation; hosting-vendor selection is deferred to deployment planning.

**Baseline:** Vietnamese-first responsive MVP, Japan launch, browse/search/filter/detail, account-synchronized favorites; no ads, paid features, fabricated catalog records, video playback, or watch links. The owner selected Wikidata (`wbsearchentities` plus WDQS) and approved Phase 2. On 2026-11-15 the owner requested anime films and genre/year filters; the design below incorporates those requirements using only field/class evidence checked in `API_VERIFICATION_REPORT.md`. Source approval does not grant image rights.

**Current account policy:** [ACCOUNT_POLICY.md](ACCOUNT_POLICY.md) supersedes
the email-verification requirements below. Personal-trial authentication uses
email/password without a confirmation email; session/CSRF protections remain.
Password recovery is excluded by owner decision; recovery mail and reset-token
flows below are historical proposals. SMTP is not an implementation dependency.

## 1. Proposed system shape

Use a Node.js/Express modular monolith behind one HTTPS origin. Express serves the static UI and `/api/v1/*`, with PostgreSQL on a private connection. A reverse proxy may serve static files separately while preserving same-origin routing. This keeps cookies simple, avoids browser CORS configuration, and leaves fewer operational components than independent frontend/backend services. PostgreSQL is the owner-selected database direction. This vendor-neutral topology is approved; select a specific host during implementation planning after checking Japan-region availability, pricing, privacy terms, backups, secrets, and monitoring.

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

The proposed exact `P31` allowlist is anime television (`Q63952888`) and anime film (`Q20650540`), both observed in multiple live Japanese anime examples. These classes are useful discriminators, not a complete taxonomy. Include an entity only when exactly one of these two approved classes is present; if neither or both are present, exclude it as unsupported/ambiguous. Other classes do not substitute for the allowlist. Japanese title search resolves candidate entity IDs; WDQS retrieves supported fields after type qualification. Search candidates alone do not establish that an item is anime.

Construct SPARQL only from fixed templates and validated QIDs matching `^Q[1-9][0-9]*$`; never interpolate user text or accept arbitrary graph/property identifiers. Apply the exact approved content-class allowlist and bounded result limits. Restrict outbound hosts to the configured official Wikidata endpoints. Use bounded timeouts/concurrency and a meaningful project User-Agent/contact in line with current upstream guidance. The internal MVP capacity target is 25 concurrent active users, 5 API requests/second sustained and 10 requests/second for bursts up to 60 seconds; this does not assert WDQS can meet that load. Recheck upstream guidance before implementation and shape/rate-limit provider calls to its terms. WDQS migration, unknown numeric quota/SLO, incomplete Japanese labels/descriptions, and uncertain catalog coverage remain external dependencies.

Search uses the Japanese Action API to resolve candidate labels/aliases and WDQS to fetch matching type-qualified records. Browse uses a bounded WDQS query for the approved anime-TV and anime-film classes in deterministic QID order; it must not imply popularity or use synthetic seed records. Filters use exact AND semantics and apply before page limiting: format is the exact class allowlist; genre requires a `P136` value whose entity has `P31=Q201658` or `Q4178140` and a Japanese label; year is four digits and uses the earliest valid TV `P580` start time or earliest Japan-qualified film `P577` (`P291=Q17`) date at year-or-better precision. Missing/low-precision dates do not match. Genre facets are limited to at most 30 validated genres from the same query's first unfiltered candidate page, sorted by Japanese label then QID; they are non-exhaustive, have no counts, and are not cached. Clients fetch this base page to populate filter controls on a direct filtered navigation. Do not advertise unsupported genre/status/season/score controls.

No persistent catalog table is proposed. Store only users, sessions, favorites (source-qualified QID references), and expiring authentication-token records. The owner selected no catalog cache; fetch Wikidata metadata on demand. A missing entity leaves its favorite reference intact and visible as unavailable; an upstream outage returns an explicit error.

## 3. Identity, normalization, and mapping boundary

Provider ID is the identity boundary. Keep Wikidata QIDs exact internally and validate them before lookup; public `animeId` is an opaque, source-qualified API ID, so clients do not parse or construct QIDs. Do not merge items by title or across sources without explicit evidence. Movie, manga, franchise, season, and TV series remain separate entities.

Normalize only supported facts with provenance: source/provider ID, canonical source URI, server `fetchedAt`, required Japanese `title`, nullable plain-text description, verified entity type, and supported detail fields. A public detail lookup with no Japanese label returns `404 NOT_FOUND`; that is an unavailable record, not a provider failure. Browse/search omit records without a Japanese label. A stored favorite for such an entity returns `availability:"unavailable"`, `anime:null`, and remains removable. A generic Wikidata description is not a synopsis. Keep year/month/day precision, missing values, and unknown classifications distinct; never turn absent numeric fields into zero or guess Vietnamese/Japanese translations. Image URLs are omitted/null unless a separate rights review approves them; no image is copied or proxied. See `DATA_MAPPING.md` for the proposed schema and field rules.

## 4. Accounts and session security proposal

Recommend email/password with Argon2id hashes and opaque server-side sessions in PostgreSQL. Cookies use `Secure`, `HttpOnly`, and `SameSite=Lax`; rotate session IDs at login and password change, revoke on logout/reset, and keep raw session/reset tokens out of the database and logs. For CSRF, derive a session-bound token as `HMAC(serverCsrfKey, rawSessionId || "csrf:v1")`; store only the session ID hash in the database and compare submitted token in constant time after validating the session. `GET /csrf` reissues the same token for the same session and preserves authenticated identity/expiry; it creates an anonymous session only when none is valid. Reloads and multiple tabs therefore do not invalidate one another. Login/re-authentication rotates the session ID, so the browser fetches a new CSRF token afterward; key rotation likewise requires a fresh token. A failed CSRF check returns `403 CSRF_INVALID` without performing or replaying the mutation. Keep the HMAC key in secret storage and out of logs. Rate-limit authentication and recovery; return generic responses that do not reveal account existence. Every favorite query/write is scoped by authenticated user ID.

For account deletion, a verified current account must re-enter its password through login while already authenticated. If credentials match that same account, rotate the session ID and set `authenticated_at` to server time only after password verification. `DELETE /me` requires explicit confirmation and `authenticated_at` no older than a configurable five-minute window (proposed default). If stale/missing, return `403 REAUTH_REQUIRED`; never infer re-authentication from `last_seen_at` or other activity, and never auto-replay deletion after re-auth. Show a confirmation screen and require a deliberate second delete action. Email delivery, verification policy, token lifetimes, recovery UX, deletion/export, retention, and registration policy remain decisions for approval. The contract includes candidate routes, not authorization to collect data or deploy them.

Social login would avoid password handling but introduces an external identity provider, account linking and recovery decisions; no such provider is selected. Persistent server-side sessions are proposed over stateless JWTs because logout/revocation and account deletion are central to the small MVP.

### Approved lifecycle amendment — 2026-11-15

The owner approved indexed `users.last_active_at`, initialized at creation and
renewed by successful login/authenticated API use. After 168 hours of inactivity,
delete the account and cascade dependent data. Voluntary deletion retains the
password reauthentication and confirmation checks above. This supersedes earlier
pending-approval wording for inactivity/deletion. SQL helpers and the cleanup
CLI are implemented; account routes/UI and production scheduling are not enabled.

## 5. UI and failure behavior

- Browse/search results use responsive cards/list, with mobile single-column layout and desktop wider grid. Do not label browse as popular or ranked. Detail shows only available verified fields and no player/watch section.
- Loading retains prior search results with progress; empty query is validation, a valid zero-result query is a clear empty state. Cancel stale requests so old results cannot replace the latest query.
- Detail and favorites expose loading, empty, error, and unavailable states. Favorite add/remove disables duplicate actions while pending; failure reverts optimistic UI and announces the result. An unavailable favorite remains removable.
- Anonymous users selecting favorite are sent through sign-in and returned to the intended detail. Account screens use labeled fields, password-manager autocomplete, generic credential errors, and accessible validation.
- Use semantic landmarks/headings, keyboard operation, visible focus, sufficient contrast, reduced-motion support, status announcements, and a WCAG 2.2 AA target for later verification. See `PHASE_3_DESIGN_REVIEW.md` for journeys and acceptance evidence.

Support current and previous major releases of Chrome, Edge, Firefox, desktop Safari, iOS Safari, and Android Chrome. Verify reflow at 320, 375, 768, 1024, and 1440 CSS-pixel viewport widths with no horizontal page scrolling. Target p75 LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 under mobile 4G-equivalent test conditions. Under the MVP load profile, target p95 <= 500 ms for health/authentication/favorite-write endpoints with no provider call; catalog and metadata-enriched favorite-list p95 <= 5 seconds and p99 <= 8 seconds when Wikidata is responsive, with an owner-approved 20 second total provider-dependent request deadline for the personal trial. This trial exception does not establish the original latency targets. Target 99.5% monthly availability for health, authentication, and favorite-write endpoints, excluding planned maintenance; track catalog and metadata-enriched favorite-list failures separately. Provider outages/timeouts return explicit errors; the external source has no verified SLO.

## 6. Deployment, secrets, backup, and restore

Deploy one HTTPS Express service plus managed PostgreSQL in Japan, with the database on a private network and provider egress from the backend only. The vendor remains unselected; verify Japan-region availability, pricing, privacy terms, backup/restore support, secrets storage, and monitoring before choosing. Keep same-origin routing; a reverse proxy or separate static hosting is acceptable if browser/API origin and cookie protections remain intact.

Keep database, session, and email secrets in environment-specific secret storage, not source control, client bundles, image layers, URLs, or logs. Rotate keys and restrict access by environment/role. Public Wikidata endpoints are not expected to need a provider secret; do not generalize this to future adapters. Use redacted structured logs, request IDs, health/readiness checks, graceful shutdown, dependency updates, and alerts without logging raw upstream bodies or personal credentials.

Back up PostgreSQL nightly with encryption and access controls; retain seven daily restore points. Target RPO <= 24 hours and RTO <= 8 hours. Rehearse restore into isolated infrastructure quarterly and before production release, verify schema version and account/favorite integrity, and record achieved recovery point/time. Retain redacted application/security logs for 30 days; never log credentials, session/CSRF/reset tokens, or raw upstream response bodies. Catalog caching remains excluded.

## 7. Decisions for owner review

The owner selected PostgreSQL, email/password with Argon2id and server-side sessions, no catalog caching, REST/JSON, and exclusion of media absent separate rights approval. The owner approved this architecture, the filter semantics, operational targets, API contract, database schema, and Phase 3 exit on 2026-11-15, then authorized Phase 4 public catalog implementation. Account lifecycle decisions (verification, recovery, deletion/export, retention, token lifetime, mail and registration abuse controls) remain blockers before account/favorite implementation. Hosting vendor selection is deferred to deployment planning against the documented Japan-region and operational requirements.

## Owner clarification ? 2026-11-15

The owner specified permanent account lifetime and authorized continuing Phase 4 through acceptance preparation. The owner subsequently clarified: accounts have no fixed end date, users may delete their accounts at any time, and accounts inactive for one week must be deleted. This supersedes the initial no-inactivity-deletion interpretation. The activity definition and proposed last_active_at schema addition await approval; no automatic deletion job is enabled. This does not define session/reset-token expiry. Email verification, recovery, export, session/token lifetimes, mail delivery and abuse-control policies remain pending explicit owner clarification. No Phase 5 transition is authorized.
