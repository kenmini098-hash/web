# Phase 3 — Design review package

**Status:** Proposal prepared for owner review; not accepted or implementation authorization.

**Context:** The latest requirements/task board and API verification report record Japan, no ads/paid features, Vietnamese-first UI, preference for Japanese metadata, Wikidata (`wbsearchentities` plus WDQS) approved as the metadata source, and Phase 2 exit approved. The source approval carries documented limits: three anime-TV samples do not prove catalog coverage; Japanese synopsis availability, numeric quota, and production SLO remain unknown; WDQS is migrating. Do not broaden that approval to third-party images or video rights.

**Document precedence note:** `REQUIREMENTS.md` has an approved-source statement in its MVP table, while its later open-decisions/closing text and older paragraphs in the verification report still describe source selection or Phase 3 as pending. `TASK_BOARD.md` marks Phase 2 exit approved. The current user instruction “bắt đầu giai đoạn 3” authorizes design work. This proposal follows the latest recorded owner decision for Wikidata and the current Phase 3 instruction; stale historical statements are preserved and not silently rewritten. Phase 3 acceptance and Phase 4 authorization remain separate gates.

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
| Authentication | Email/password, Argon2id, server-side sessions, secure cookies, CSRF | Verification/reset/delete token routes and tables are proposed; registration policy, lifetimes, email service and retention unresolved. |
| Images/video | No image by default pending rights; no hosted/embedded video or watch links | Matches FR-06 and separate image rights finding. |
| Existing governance files | `PROJECT_PLAN.md`, `REQUIREMENTS.md`, `TASK_BOARD.md` left untouched | They were dirty before this task; preserve their edits. |

## UI journeys and responsive behavior

1. **Browse/search:** Landing page has a prominent Vietnamese search field and browse list/grid of source-backed anime-TV results; browse is bounded and deterministically ordered by QID, not popular/ranked. Anime TV is the only currently evidenced type; anime films await class verification. On mobile use one-column cards and a persistent top search/navigation; on desktop use a wider result grid and only the `anime_tv` filter if approved. Submit or debounce after 300 ms; cancel stale requests. Loading keeps existing results visible with progress; no-result copy distinguishes a valid empty search from blank input. Provider failure gives retry and does not show fake cards.
2. **Detail:** Selecting a result opens a detail route with title, available language variants, description and verified fields only. Responsive order is title/metadata first, then description; no video player. Missing description/date/episodes is rendered as “chưa có dữ liệu” or omitted, not as an invented value. If entity type is ambiguous, communicate that uncertainty or do not present it as confirmed anime.
3. **Favorite:** Anonymous users are prompted to sign in; after sign-in return to the requested detail. Signed-in user toggles favorite; loading state disables duplicate submissions, success is announced to assistive tech, and failures revert optimistic state. Favorites page lists `FavoriteItem`s; a definitive unavailable item has `anime:null` and stays removable; provider outage is a list error.
4. **Account:** Candidate registration, verification, login/logout, password reset/change, and deletion use generic responses, visible labels, password-manager autocomplete and accessible validation. Recovery/verification UX, mail delivery, token expiry, open registration and deletion policy require approval before implementation.

Use breakpoints as implementation details to be selected during UI work; the required behavior is usable reflow from narrow mobile through desktop with no horizontal page scrolling. Navigation must remain available by keyboard and touch. Empty, loading, unauthenticated, unavailable, and error states are designed alongside success screens.

## Accessibility expectations

- Semantic landmarks/headings and a logical heading order; all controls have programmatic labels and visible focus.
- Full keyboard navigation, no keyboard trap, skip link, and focus restoration after dialogs/routes.
- WCAG 2.2 AA target for contrast, text resizing, focus visibility, target size, and reflow; verify with manual keyboard and screen-reader review during acceptance.
- Announce search result counts, loading completion, and favorite changes without repeatedly announcing every card. Respect reduced-motion settings; skeletons do not replace accessible status text.
- Images, if later approved, need useful alt text or empty alt for decoration; never use title text as an inaccurate description.

## Security, privacy, secrets, recovery

- Validate query/body/path/cursor sizes and types server-side; allowlist fields; parameterize database queries; bound request body, concurrency, and upstream timeouts.
- Authentication uses password hashing, session rotation/revocation, CSRF defense, secure cookie flags, login throttling, and ownership checks on every favorite route. Prevent account enumeration and redact sensitive data from logs.
- Add restrictive security headers, HTTPS-only cookies, same-origin policy, dependency review, and least-privilege database credentials. Provider network errors are translated to stable contract errors; never return raw upstream payloads, server traces, or secret values.
- Keep database, session, and mail credentials in managed environment secret storage; never in Git, client bundles, container image layers, URLs, or logs. Rotate and audit access.
- Minimize personal data to normalized email, password hash, sessions, and favorites. Approve retention, account deletion, export, email verification, and recovery policy before implementation.
- Encrypt database backups and restrict access. Document backup schedule and retention after provider/host selection. Rehearse restore into isolated infrastructure before release; check schema version, account/favorite consistency and app connectivity. Agree RPO/RTO before declaring restore readiness. Do not back up transient provider cache.

## Acceptance matrix (proposed for later implementation/acceptance)

| Area | Acceptance evidence expected | Current status |
| --- | --- | --- |
| Browse/search/detail | Real responses from approved Wikidata path; anime-TV Q63952888 type check, candidate ambiguity, missing Japanese fields, empty result, deterministic browse and provider failure handled without fabricated records | Design only; class evidence is only two verified examples; no catalog completeness proof |
| Provider boundary | UI/API contract uses normalized records and opaque IDs; server validates QIDs, fixed SPARQL templates and type allowlist; upstream failures map to stable errors | Design only; WDQS migration, quota/SLO remain uncertain |
| Favorites/account | CSRF-bound authenticated user can add/list/remove favorites; users cannot touch others' rows; stable user-scoped pagination; unavailable metadata does not erase references | Design only; account policy/mail/token lifetimes open |
| Responsive/UI states | Narrow mobile and desktop journeys for loading, empty, failure, unauthorized, unavailable and success states | Design only; browser matrix and numeric viewport targets open |
| Accessibility | Keyboard-only flows, screen-reader labels/status messages, contrast/reflow and focus checks meet agreed WCAG 2.2 AA target | Proposed target; not tested |
| Security/privacy | No secrets in client/repository/logs; password/session controls, CSRF, validation, authorization, throttling, privacy/retention review; no unresolved Critical/High findings before release | Design only; requires Phase 6 evidence |
| Upstream resilience | Bounded timeout/concurrency, retry policy, graceful provider outage, cache obeys approved guidance | Design only; WDQS quota/SLO uncertain and migration ongoing |
| Backup/restore | Encrypted scheduled backup plus successful isolated restore rehearsal and documented RPO/RTO | Proposal only; host/cadence/targets open |
| Rights/data | Structured-data provenance retained; no image without separate rights check; no video/watch links | Policy proposed; do not infer rights from metadata approval |

## Open decisions before Phase 3 exit / Phase 4

1. Approve/revise topology, PostgreSQL, session auth, transient-only catalog handling, anime-TV-only initial allowlist, deterministic browse, filter scope, and companion contract/schema.
2. Confirm registration and account lifecycle: verification requirement, recovery, deletion/export, retention, token expiry, mail service and registration abuse controls.
3. Select host/region, supported browsers, traffic assumptions, latency targets, backup cadence, RPO/RTO, log retention and alert ownership.
4. Confirm whether images are excluded or require separate rights review. Keep video and watch links excluded unless separately authorized for Japan.
5. Decide treatment of ambiguous Wikidata entities and acceptance threshold for Japanese title/description coverage; current evidence does not prove completeness.
6. Recheck WDQS migration, endpoint guidance and usage expectations before Phase 4; absent numeric quota/SLO does not mean unlimited capacity.

**Handoff:** Phase 3 design deliverables are drafted. This package does not record user acceptance, Phase 3 exit, or authorization for Phase 4. No application code was changed, no external provider was contacted, and no commit/push was made.
