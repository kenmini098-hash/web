# Phase 3 — Design review package

**Status at review:** Phase 3 design and exit approved by the owner on 2026-11-15. At that time, account lifecycle and hosting-vendor decisions remained blockers before implementation, and Phase 4 had not been separately authorized. The owner later authorized Phase 4 public catalog implementation on 2026-11-15; account/favorite work remains blocked on lifecycle decisions.

**Context:** The owner approved Wikidata (`wbsearchentities` plus WDQS) and Phase 2 exit, and authorized Phase 3. On 2026-11-15 the owner selected PostgreSQL, email/password + Argon2id + server-side sessions, no catalog cache, REST/JSON, and requested anime-TV/anime-film records with genre/year filters. Live sample checks support both content classes and sample `P136`/date fields, but do not prove catalog coverage, reliable genre taxonomy, Japanese synopsis availability, numeric quota, or production SLO; WDQS is migrating. No image/video rights are included.

**Document precedence note:** Earlier candidate research and initial acceptance findings are preserved as history. Current API verification, requirements, task board, architecture, contract, and mapping record the 2026-11-15 scope/technology directions. Phase 3 exit is approved; Phase 4 was separately authorized afterward.

## Decisions and provenance log

| Topic | Proposal | Evidence / status |
| --- | --- | --- |
| Metadata source | Wikidata title lookup + WDQS structured fields behind adapter | Owner decision recorded in `REQUIREMENTS.md`, `TASK_BOARD.md`, and `API_VERIFICATION_REPORT.md`; source selected/approved with limitations, not a claim of completeness. |
| Provider coupling | Internal adapter and normalized model | Design recommendation; keeps public API independent of upstream query syntax. |
| UI/API topology | Same-origin frontend + Express JSON API, modular monolith | Owner approved the architecture on 2026-11-15; this does not approve the API contract, schema, or implementation. |
| Catalog type | Anime TV (`Q63952888`) and anime film (`Q20650540`) exact-class allowlist | Both classes observed in multiple live Japanese examples; neither is a complete taxonomy. Unknown types remain excluded. |
| Browse/filter | Japanese search and bounded WDQS browse, deterministic QID order; type, genre, and year filters | Exact AND semantics before page limiting. Genre only from `P136` entities with Japanese labels and `P31=Q201658` or `Q4178140`; up to 30 facets from the same query's first unfiltered candidate page, sorted by label/QID, no counts, non-exhaustive. Year uses earliest valid TV `P580` or earliest Japan-qualified film `P577`/`P291=Q17`, precision year or better. Owner approved these filter semantics on 2026-11-15. |
| IDs | Exact QID stored internally; opaque source-qualified `animeId` in the contract | Avoids client coupling and title-based identity; adapter validates QID syntax. |
| Database | PostgreSQL for users, sessions, favorites, and expiring auth tokens; no catalog table | Owner approved the current schema for Phase 3 design on 2026-11-15; implementation remains gated. |
| Authentication | Email/password, Argon2id, server-side sessions, secure cookies, HMAC-derived session CSRF token | Owner selected the pattern; same-session CSRF and recent re-authentication are specified. Verification, recovery, mail, retention, and registration policies remain open. |
| API/cache/media | REST/JSON; no catalog cache; no image/video/watch links absent separate rights approval | Owner selected these directions; filter interaction rules and operational objectives are now specified. Deployment vendor selection is deferred to implementation planning. |
| Operational targets | Browser/viewport matrix; 25 concurrent users, 5 RPS sustained / 10 RPS burst; API, catalog and Core Web Vitals latency; availability; log retention; backup/RPO/RTO | Owner approved the proposed targets on 2026-11-15. They remain design acceptance targets; runtime/load/restore evidence is required later. No WDQS SLO is implied. |
| Governance status | Requirements, plan, and task board reconciled to current phase authorization | Owner approved Phase 3 exit on 2026-11-15. Phase 4 has not been separately authorized. |

## UI journeys and responsive behavior

1. **Browse/search:** Landing page has a prominent Vietnamese search field and browse list/grid of source-backed anime-TV and anime-film results; browse is bounded and deterministically ordered by QID, not popular/ranked. Filters apply with AND before page limiting. The UI offers only the at-most-30 validated Japanese genre facets returned for the first unfiltered page of that browse/search query, sorted by label then QID; it must label these as available suggestions, not all genres. Keep facets in page state; when opening a filtered URL directly, fetch the base unfiltered first page before rendering filter controls. Year is four digits: TV uses earliest valid `P580`; film uses earliest `P577` qualified with `P291=Q17`; missing or less-than-year precision values do not match. On mobile use one-column cards and persistent top search/navigation; on desktop use a wider result grid. Submit or debounce after 300 ms; cancel stale requests. Loading keeps existing results visible with progress; empty result distinguishes a valid zero-match search from blank input. Provider failure gives retry and does not show fake cards.
2. **Detail:** Selecting a result opens a detail route with required Japanese title, nullable generic description, and verified fields only. If no Japanese label exists, direct detail returns 404 unavailable (not provider error); browse/search omit the item. A saved favorite whose label later disappears stays listed as unavailable with `anime:null`, never a fabricated title. Missing description/date/episodes is rendered as “chưa có dữ liệu” or omitted, not as an invented value. If entity type is ambiguous, do not present it as confirmed anime.
3. **Favorite:** Anonymous users are prompted to sign in; after sign-in return to the requested detail. Signed-in user toggles favorite; loading state disables duplicate submissions, success is announced to assistive tech, and failures revert optimistic state. Favorites page lists `FavoriteItem`s; a definitive unavailable item has `anime:null` and stays removable; provider outage is a list error.
4. **Account:** Candidate registration, verification, login/logout, password reset/change, and deletion use generic responses, visible labels, password-manager autocomplete and accessible validation. To delete, user re-enters credentials for the same verified current account, which rotates session; then sees an explicit confirmation. If the proposed five-minute re-authentication window expires, API returns `REAUTH_REQUIRED`; user logs in and confirms again. Never delete from activity/last-seen state or auto-replay. Recovery/verification UX, mail delivery, token expiry, open registration and retention policy require approval before implementation.

Use breakpoints as implementation details to be selected during UI work; the required behavior is usable reflow from narrow mobile through desktop with no horizontal page scrolling. Navigation must remain available by keyboard and touch. Empty, loading, unauthenticated, unavailable, and error states are designed alongside success screens.

## Accessibility expectations

- Semantic landmarks/headings and a logical heading order; all controls have programmatic labels and visible focus.
- Full keyboard navigation, no keyboard trap, skip link, and focus restoration after dialogs/routes.
- WCAG 2.2 AA target for contrast, text resizing, focus visibility, target size, and reflow; verify with manual keyboard and screen-reader review during acceptance.
- Announce search result counts, loading completion, and favorite changes without repeatedly announcing every card. Respect reduced-motion settings; skeletons do not replace accessible status text.
- Images, if later approved, need useful alt text or empty alt for decoration; never use title text as an inaccurate description.

## Security, privacy, secrets, recovery

- Validate query/body/path/cursor sizes and types server-side; allowlist fields; parameterize database queries; bound request body, concurrency, and upstream timeouts.
- Authentication uses password hashing, session rotation/revocation, secure cookie flags, login throttling, and ownership checks on every favorite route. CSRF is `HMAC(serverCsrfKey, rawSessionId || "csrf:v1")`; server first validates session ID hash, derives the same token, and compares in constant time. Same-session `GET /csrf` reissues the same token across tabs/reloads; only session rotation (or key rotation) requires refresh. Invalid CSRF returns `403 CSRF_INVALID` and does not mutate; show an error and require explicit user retry, never replay automatically. Account deletion needs `authenticated_at` set only on password success within configurable five minutes, explicit confirmation, or returns `403 REAUTH_REQUIRED`; never use last-seen or auto-replay. Prevent account enumeration and redact sensitive data from logs.
- Add restrictive security headers, HTTPS-only cookies, same-origin policy, dependency review, and least-privilege database credentials. Provider network errors are translated to stable contract errors; never return raw upstream payloads, server traces, or secret values.
- Keep database, session, and mail credentials in managed environment secret storage; never in Git, client bundles, container image layers, URLs, or logs. Rotate and audit access.
- Minimize personal data to normalized email, password hash, sessions, and favorites. Approve retention, account deletion, export, email verification, and recovery policy before implementation.
- Encrypt database backups and restrict access. Target nightly backups with seven daily restore points, RPO <= 24 hours, RTO <= 8 hours, and quarterly plus pre-release isolated restore rehearsals. Verify schema version, account/favorite consistency and app connectivity. Do not back up transient provider cache; select a host that can meet these targets.

## Acceptance matrix (proposed for later implementation/acceptance)

| Area | Acceptance evidence expected | Current status |
| --- | --- | --- |
| Browse/search/detail | Real responses from approved Wikidata path; anime-TV/anime-film class checks, genre validation, Japan-year rules, candidate ambiguity, missing Japanese fields, empty result, deterministic browse and provider failure handled without fabricated records | Design only; multiple representative samples checked, but no catalog completeness or genre taxonomy guarantee |
| Provider boundary | UI/API contract uses normalized records and opaque IDs; server validates QIDs, fixed SPARQL templates and type allowlist; upstream failures map to stable errors | Design only; WDQS migration, quota/SLO remain uncertain |
| Favorites/account | CSRF-bound authenticated user can add/list/remove favorites; users cannot touch others' rows; stable user-scoped pagination; no Japanese label gives detail 404 and an unavailable favorite without provider-error classification; delete requires recent verified password re-authentication plus confirmation | Design only; account policy/mail/token lifetimes open |
| Responsive/UI states | Current/previous major Chrome, Edge, Firefox, desktop Safari, iOS Safari, Android Chrome; viewport widths 320/375/768/1024/1440 CSS px; no horizontal overflow | Targets defined; verification belongs to implementation/acceptance testing |
| Accessibility | Keyboard-only flows, screen-reader labels/status messages, contrast/reflow and focus checks meet agreed WCAG 2.2 AA target | Proposed target; not tested |
| Security/privacy | No secrets in client/repository/logs; password/session controls, CSRF, validation, authorization, throttling, privacy/retention review; no unresolved Critical/High findings before release | Design only; requires Phase 6 evidence |
| Upstream resilience | 8-second total catalog deadline; explicit timeout/provider errors; internal load target 25 concurrent users, 5 RPS sustained, 10 RPS burst for 60 seconds | Targets defined, conditional on WDQS guidance/capacity; no provider SLA claimed |
| Performance/availability | Health/auth/favorite-write p95 <=500ms; catalog and metadata-enriched favorite-list p95 <=5s/p99 <=8s while upstream responds; 99.5% monthly for health/auth/favorite-write endpoints; mobile p75 LCP <=2.5s, INP <=200ms, CLS <=0.1 | Targets defined; must be measured under stated profile |
| Backup/restore | Encrypted nightly PostgreSQL backup, seven daily restore points, RPO <=24h, RTO <=8h, quarterly and pre-release isolated restore rehearsal | Targets defined; host must support them; runtime proof required before release |
| Rights/data | Structured-data provenance retained; no image without separate rights check; no video/watch links | Policy proposed; do not infer rights from metadata approval |

## Remaining blockers before Phase 4 implementation

1. Resolve registration and account lifecycle before implementation: verification requirement, recovery, deletion/export, retention, token expiry, mail service and registration abuse controls; review proposed configurable five-minute delete re-authentication window.
3. Hosting vendor selection is deferred to implementation planning, not a Phase 3 design decision. Before implementation, select a vendor supporting Japan region, private managed PostgreSQL, nightly encrypted backups, restore targets, secret storage, and monitoring; verify pricing and terms.
4. No images, video, or watch links are included without separate rights authorization. Any proposal to add media must receive that review before implementation.
5. Apply the data-quality gate: every emitted item must have exactly one approved type and a Japanese title; generic Japanese description may be absent and is nullable. No minimum catalog or genre coverage is promised.
6. Recheck WDQS migration, endpoint guidance and usage expectations before Phase 4; absent numeric quota/SLO does not mean unlimited capacity.

## Handoff report

- **Phase:** 3 — Architecture and design.
- **Responsible agent:** ChatGPT project manager/coordinator. API research remains assigned to the owner-designated GPT-6 Astra agent; this review did not repeat that research.
- **Assigned task:** Review the existing architecture, database mapping, API contract, and Phase 2 evidence for consistency; prepare the design package for owner review.
- **Completed:** Reconciled owner decisions, checked representative anime-film classes, genre entities, and Japan/year date statements; aligned QID identity, normalized metadata, favorites, CSRF, deletion re-authentication, filters, and error behavior across design docs.
- **Files updated for the design/review:** `ARCHITECTURE.md`, `API_CONTRACT.md`, `DATA_MAPPING.md`, `REQUIREMENTS.md`, `API_VERIFICATION_REPORT.md`, `TASK_BOARD.md`, and acceptance/review records. No application code was changed.
- **Test results:** Public read-only Wikidata Action API and WDQS sample checks succeeded; `git diff --check` is the documentation validation. No application or runtime security tests were run.
- **Evidence:** `API_VERIFICATION_REPORT.md` records sample QIDs, classes, `P136` genre statements, `P580` TV start times, and Japan-qualified `P577` film dates; the other design documents specify the proposed system.
- **Issues found:** Wikidata catalog/genre completeness, Japanese synopsis availability, numeric quota, and WDQS production SLO are not guaranteed; the genre facets are bounded and non-exhaustive. Account lifecycle policies remain open. Hosting vendor selection is deferred; browser, load, latency, availability, logging, and backup/recovery targets are now specified but have not been runtime-tested.
- **Outstanding work:** Resolve account lifecycle policies and select a hosting vendor before implementation. Obtain separate Phase 4 authorization before starting implementation.
- **Recommendation:** Keep implementation gated until those blockers are resolved and Phase 4 is explicitly authorized.
- **Status:** Phase 3 exit approved; Phase 4 not authorized.

This review changed no application code and contacted no external provider. It created no Git commit and made no push.
