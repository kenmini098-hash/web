# Phase 3 — Design review package

**Status:** Coordinator review completed; owner decisions and Phase 3 acceptance remain pending. Not implementation authorization.

**Context:** The latest requirements/task board and API verification report record Japan, no ads/paid features, Vietnamese-first UI, preference for Japanese metadata, Wikidata (`wbsearchentities` plus WDQS) approved as the metadata source, and Phase 2 exit approved. The source approval carries documented limits: three anime-TV samples do not prove catalog coverage; Japanese synopsis availability, numeric quota, and production SLO remain unknown; WDQS is migrating. Do not broaden that approval to third-party images or video rights.

**Document precedence note:** The API verification report preserves the timeline of earlier candidate research and its pre-decision recommendations; its final owner-decision record approves Wikidata and Phase 2 exit, while the user's later instruction “bắt đầu giai đoạn 3” authorizes design work. Current requirements and project status documents have been reconciled to these decisions. Phase 3 acceptance and Phase 4 authorization remain separate gates.

## Decisions and provenance log

| Topic | Proposal | Evidence / status |
| --- | --- | --- |
| Metadata source | Wikidata title lookup + WDQS structured fields behind adapter | Owner decision recorded in `REQUIREMENTS.md`, `TASK_BOARD.md`, and `API_VERIFICATION_REPORT.md`; source selected/approved with limitations, not a claim of completeness. |
| Provider coupling | Internal adapter and normalized model | Design recommendation; keeps public API independent of upstream query syntax. |
| UI/API topology | Same-origin frontend + Express JSON API, modular monolith | Design recommendation; requires owner approval. |
| Catalog type | Anime-TV-only first release (`Q63952888`), exclude films/other types | Q63952888 observed in two verified examples; not a complete taxonomy. Anime-film class is unverified. Decision needed before accepting the narrowed catalog scope. |
| Browse/filter | Bounded WDQS browse, deterministic QID order; Japanese text search; optional `entityType=anime_tv` only | No popularity claim. Requirement includes filtering; deferring other filters is an explicit scope tradeoff requiring owner approval. |
| IDs | Exact QID stored internally; opaque source-qualified `animeId` in the contract | Avoids client coupling and title-based identity; adapter validates QID syntax. |
| Database | PostgreSQL for users, sessions, favorites, one-time auth tokens only | Design recommendation; no persistent catalog copy; requires approval. |
| Authentication | Email/password, Argon2id, server-side sessions, secure cookies, HMAC-derived session CSRF token | Same-session CSRF reissue supports multiple tabs; session rotation invalidates it. Deletion requires password-verified `authenticated_at` within configurable proposed 5-minute window and deliberate confirmation. Token/email/retention policies still need approval. |
| Images/video | No image by default pending rights; no hosted/embedded video or watch links | Matches FR-06 and separate image rights finding. |
| Governance status | Requirements, plan, and task board reconciled to current phase authorization | Existing edits were preserved; only stale phase/source statements were corrected. |

## UI journeys and responsive behavior

1. **Browse/search:** Landing page has a prominent Vietnamese search field and browse list/grid of source-backed anime-TV results; browse is bounded and deterministically ordered by QID, not popular/ranked. Anime TV is the only currently evidenced type; anime films await class verification. On mobile use one-column cards and a persistent top search/navigation; on desktop use a wider result grid and only the `anime_tv` filter if approved. Submit or debounce after 300 ms; cancel stale requests. Loading keeps existing results visible with progress; no-result copy distinguishes a valid empty search from blank input. Provider failure gives retry and does not show fake cards.
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
- Encrypt database backups and restrict access. Document backup schedule and retention after provider/host selection. Rehearse restore into isolated infrastructure before release; check schema version, account/favorite consistency and app connectivity. Agree RPO/RTO before declaring restore readiness. Do not back up transient provider cache.

## Acceptance matrix (proposed for later implementation/acceptance)

| Area | Acceptance evidence expected | Current status |
| --- | --- | --- |
| Browse/search/detail | Real responses from approved Wikidata path; anime-TV Q63952888 type check, candidate ambiguity, missing Japanese fields, empty result, deterministic browse and provider failure handled without fabricated records | Design only; class evidence is only two verified examples; no catalog completeness proof |
| Provider boundary | UI/API contract uses normalized records and opaque IDs; server validates QIDs, fixed SPARQL templates and type allowlist; upstream failures map to stable errors | Design only; WDQS migration, quota/SLO remain uncertain |
| Favorites/account | CSRF-bound authenticated user can add/list/remove favorites; users cannot touch others' rows; stable user-scoped pagination; no Japanese label gives detail 404 and an unavailable favorite without provider-error classification; delete requires recent verified password re-authentication plus confirmation | Design only; account policy/mail/token lifetimes open |
| Responsive/UI states | Narrow mobile and desktop journeys for loading, empty, failure, unauthorized, unavailable and success states | Design only; browser matrix and numeric viewport targets open |
| Accessibility | Keyboard-only flows, screen-reader labels/status messages, contrast/reflow and focus checks meet agreed WCAG 2.2 AA target | Proposed target; not tested |
| Security/privacy | No secrets in client/repository/logs; password/session controls, CSRF, validation, authorization, throttling, privacy/retention review; no unresolved Critical/High findings before release | Design only; requires Phase 6 evidence |
| Upstream resilience | Bounded timeout/concurrency, retry policy, graceful provider outage, cache obeys approved guidance | Design only; WDQS quota/SLO uncertain and migration ongoing |
| Backup/restore | Encrypted scheduled backup plus successful isolated restore rehearsal and documented RPO/RTO | Proposal only; host/cadence/targets open |
| Rights/data | Structured-data provenance retained; no image without separate rights check; no video/watch links | Policy proposed; do not infer rights from metadata approval |

## Open decisions before Phase 3 exit / Phase 4

1. Approve/revise topology, PostgreSQL, session auth, transient-only catalog handling, anime-TV-only initial allowlist, deterministic browse, filter scope, and companion contract/schema.
2. Confirm registration and account lifecycle: verification requirement, recovery, deletion/export, retention, token expiry, mail service and registration abuse controls; review proposed configurable five-minute delete re-authentication window.
3. Select host/region, supported browsers, traffic assumptions, latency targets, backup cadence, RPO/RTO, log retention and alert ownership.
4. Confirm whether images are excluded or require separate rights review. Keep video and watch links excluded unless separately authorized for Japan.
5. Decide treatment of ambiguous Wikidata entities and acceptance threshold for Japanese title/description coverage; current evidence does not prove completeness.
6. Recheck WDQS migration, endpoint guidance and usage expectations before Phase 4; absent numeric quota/SLO does not mean unlimited capacity.

## Handoff report

- **Phase:** 3 — Architecture and design.
- **Responsible agent:** ChatGPT project manager/coordinator. API research remains assigned to the owner-designated GPT-6 Astra agent; this review did not repeat that research.
- **Assigned task:** Review the existing architecture, database mapping, API contract, and Phase 2 evidence for consistency; prepare the design package for owner review.
- **Completed:** Cross-checked source approval and limits, supported anime-TV type, QID identity, normalized metadata, favorites, CSRF token reissue and account deletion re-authentication flows, error behavior, and the boundary between proposals and approved decisions. Corrected stale current-phase/source-selection statements and aligned the QID validation rule and title shape.
- **Files updated for the design and this review:** `ARCHITECTURE.md`, `API_CONTRACT.md`, `DATA_MAPPING.md`, and `PHASE_3_DESIGN_REVIEW.md`. Other dirty governance/research files were preserved; no implementation files were changed.
- **Test results:** No application tests were run because no application code changed. `git diff --check` passed for the working changes.
- **Evidence:** Current requirements and phase approvals in `REQUIREMENTS.md` and `TASK_BOARD.md`; source findings and owner decision in `API_VERIFICATION_REPORT.md`; cross-component proposals in `ARCHITECTURE.md`, `API_CONTRACT.md`, and `DATA_MAPPING.md`.
- **Issues found:** The anime-TV-only proposal narrows the approved search/filter baseline; catalog coverage and Japanese description availability are not guaranteed; database, authentication lifecycle, caching, hosting, image policy, and measurable performance/backup targets still need owner decisions.
- **Outstanding work:** Review `PHASE_3_ACCEPTANCE_REPORT.md`, decide the open scope/architecture/authentication/operations items, and approve or revise the design package and Phase 3 exit. Keep Phase 4 implementation gated on separate explicit approval.
- **Recommendation:** Record approval or requested revisions against the acceptance report. No implementation should begin before the complete Phase 3 package is accepted.
- **Status:** Awaiting owner review; Phase 3 exit is not yet approved.

This review changed no application code and contacted no external provider. It created no Git commit and made no push.
