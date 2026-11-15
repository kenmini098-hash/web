# Anime Website - Requirements and Scope

**Status:** Phases 1-3 approved; Phase 4 active for the public catalog slice
**Project phase:** 4 - Implementation
**Version:** 0.4

## 1. Product objective

Build a responsive Anime Website with a frontend, a Node.js and Express.js
backend, an API, and database integration, consistent with the project quality
requirements. The product must use real, properly sourced data in production.
Video playback may only use sources the project is authorized to use. The
owner selected PostgreSQL and REST/JSON and approved the architecture, schema,
and API contract on 2026-11-15. Phase 4 is authorized for public catalog
browse, search, filters, and details. Account/favorite work remains blocked on
account lifecycle decisions; the hosting vendor is deferred to deployment
planning.

## 2. Stakeholders and responsibilities

- **User / product owner:** Sets direction and approves each phase.
- **ChatGPT coordinator:** Coordinates phases, reviews scope and architecture,
  and presents acceptance results to the user.
- **Owner-designated ChatGPT API agent (GPT-5.6 Terra):** Verifies candidate
  anime APIs, documentation, endpoints, response data, limits, and terms before
  integration. The project manager reviews the findings independently.
- **GitHub Copilot implementation role:** Implements and tests approved work.

These are project governance assignments; they do not establish that any API
has already been verified or approved.

## 3. Scope

### In scope

- A responsive frontend for discovering anime and viewing anime information.
- A Node.js and Express.js backend, API, database, and frontend-to-backend
  integration.
- Account-based synchronization of users' anime favorites, limited to this
  MVP capability; authentication and account lifecycle details need later
  design approval.
- Integration with anime APIs only after their documentation, behavior, and
  usage terms have been verified and accepted.
- Error handling, code quality, functional and security testing, and deployment
  preparation, in their respective approved phases.
- Technical documentation, including the API contract, data mapping, and
  deployment and backup guidance, as those deliverables are approved.

### Out of scope unless separately approved

- Hosting, redistributing, scraping, or bypassing access controls for video.
- Using unverified third-party APIs or fabricated production catalog data.
- Selecting a hosting provider or deployment topology before the relevant
  review and approval.
- Adding subscriptions, payments, social features, or an admin content
  workflow without explicit scope approval.

## 4. Functional requirements

The following requirements capture the project brief. Product details not
specified by the brief are listed as open decisions rather than assumed.

| ID | Requirement |
| --- | --- |
| FR-01 | The application shall present anime information obtained from an approved, verified data source. |
| FR-02 | The frontend shall communicate with the project backend; it shall not expose private provider credentials. |
| FR-03 | The application shall use an API contract approved before implementation for the frontend's approved anime use cases. REST/JSON is the owner-selected direction; the complete contract remains subject to Phase 3 approval. |
| FR-04 | The backend shall connect to the approved database and handle persistence errors explicitly. |
| FR-05 | The application shall communicate loading, empty, and error states clearly to users. |
| FR-06 | The application shall not host or embed video. It may show an external watch link only after lawful authorization and provider terms are verified; otherwise, omit the link. |
| FR-07 | The production application shall not present fabricated anime records as real catalog data. |
| FR-08 | The project shall provide deployment instructions and a database backup/restore procedure before release. |
| FR-09 | Users shall be able to synchronize their anime favorites through an account; authentication and account lifecycle details remain subject to architecture review. |

## 5. MVP baseline decisions

The product owner supplied and approved the following MVP decisions on
2026-11-14. Phase 1 and Phase 2 exits are approved. Wikidata is the selected
metadata source; PostgreSQL and REST/JSON were selected as design directions
on 2026-11-15. The detailed architecture and full Phase 3 package still await
owner review.

| Area | MVP choice | Basis / open details |
| --- | --- | --- |
| Audience and language | Vietnamese-first interface for anime fans. | Vietnamese-first interface is confirmed; target audience wording is an assumption to validate. |
| Main journeys | Browse anime, search/filter by TV/film, genre, and year, view details, and manage favorites synchronized through an account. | Product owner confirmed the baseline journeys and requested these filters on 2026-11-15; data coverage is incomplete and is documented in Phase 3 design. |
| Favorites and accounts | Favorites synchronize through an account. | Product owner selected email/password, Argon2id, and server-side sessions on 2026-11-15; account lifecycle, verification, recovery, and data retention remain open. |
| Video | No hosted or embedded playback. Provide an external watch link only if its source and rights/terms are verified; otherwise omit it. | Product owner confirmed this policy; no source is approved yet. |
| Business model | No advertising or paid features in the MVP. | Confirmed by the product owner on 2026-11-14. |
| API cost | Prefer an API with no usage fee for the approved MVP workload. | Product owner preference on 2026-11-14; free access does not by itself establish rights or suitability. |
| Data | Use only a source verified for the intended use; no fabricated production catalog entries. | Owner approved Wikidata (WDQS + `wbsearchentities`) as the metadata source on 2026-11-14, accepting reported coverage/operational limits. This grants no video or third-party image rights. MAL remains paused. |
| Source language | Prefer Japanese-language source data; verify field-level coverage. | Product owner requested Japanese-language data on 2026-11-14; live tests confirm Japanese labels/genres and sample type/date fields, but not complete catalog or synopsis coverage. |
| Catalog storage | Do not persist or cache catalog data. | Product owner selected no catalog cache on 2026-11-15; source terms and coverage limits still apply. |
| Devices | Responsive layout for mobile and desktop. | Support current and previous major versions of Chrome, Edge, Firefox, desktop Safari, iOS Safari, and Android Chrome. Test widths 320, 375, 768, 1024, and 1440 CSS pixels without horizontal page scrolling. |
| Region and performance | Japan launch region; MVP target profile of 25 concurrent active users, 5 API requests/second sustained, and 10 requests/second for bursts up to 60 seconds. | Japan selected on 2026-11-14; owner approved the operational target proposal on 2026-11-15. These are acceptance targets, not a provider capacity guarantee; validate with load tests. |

### UX details still to define

Scaffold filenames are not a product specification. The product owner has
confirmed the MVP journeys above; detailed behavior must match the verified
data source and the architecture/API contract approved in Phase 3.

## 6. Non-functional requirements

- **Security:** Do not commit credentials; validate inputs; apply least
  privilege; handle errors without exposing secrets or internal stack traces.
- **Privacy:** Collect and retain only data required by explicitly approved
  features. Authentication method is selected; account lifecycle and
  personal-data retention requirements remain undecided.
- **Compatibility and UX:** The frontend shall be responsive across agreed
  device sizes and provide understandable loading, empty, and failure states.
- **Reliability:** Provider and database failures shall be handled explicitly;
  invalid or incomplete upstream data shall not be silently treated as valid.
- **Availability:** Target 99.5% monthly availability for application-
  controlled health, authentication, and favorite-write endpoints, excluding
  planned maintenance. Track catalog and metadata-enriched favorite-list
  failures separately; Wikidata has no verified production SLO.
- **Maintainability:** Keep API contracts, schema/data mapping, configuration,
  and deployment instructions synchronized with approved implementation.
- **Performance:** At the MVP target load above, health/authentication/favorite
  write endpoints with no provider call shall meet p95 <= 500 ms. Catalog
  browse/search and metadata-enriched favorite listing shall meet p95 <= 5
  seconds and p99 <= 8 seconds when Wikidata is responsive. Enforce an 8
  second total deadline for provider-dependent requests and return a clear
  upstream error on timeout; never fabricate a success response. Frontend
  targets at mobile 4G-equivalent test conditions: LCP <= 2.5 seconds, INP <=
  200 ms, CLS <= 0.1 at p75.
- **Backup and recovery:** Encrypted nightly PostgreSQL backups, seven daily
  restore points, RPO <= 24 hours, and RTO <= 8 hours. Rehearse restore to
  isolated infrastructure at least quarterly and before production release.
- **Logging:** Retain redacted application/security logs for 30 days; exclude
  passwords, session/CSRF/reset tokens, raw upstream bodies, and credentials.
- **Release quality:** Do not release with unresolved Critical or High
  security findings.

## 7. Constraints and dependencies

- The project brief specifies Node.js and Express.js. The corresponding
  scaffold files are empty and do not establish an implementation.
- PostgreSQL and its design schema are owner-approved.
- Wikidata selection and the Phase 3 mapping are approved; current endpoint
  behavior, provider limits, field coverage, and actual query behavior still
  require verification before integration acceptance.
- Legal rights to any video source must be established before playback work.
- The official GitHub repository is
  `https://github.com/kenmini098-hash/web.git`; the local Git remote matches
  this URL. Publishing the updated project documents remains undecided.
- The implementation scaffold was observed empty during Phase 1. The API and
  data-mapping documents contain the approved design. Phase 4 is now authorized
  for the public catalog slice. Account/favorite implementation awaits account
  lifecycle decisions; the local documents have not been published to GitHub.

## Approved lifecycle amendment — 2026-11-15

The owner approved `last_active_at` and the implementation: activity means
successful login or authenticated API use, starting at account creation.
Accounts have no fixed lifetime but are deleted after 168 hours of inactivity,
including their favorites, sessions and auth tokens. Voluntary deletion remains
available after password reauthentication and confirmation. This supersedes
earlier pending-approval wording for these decisions. Verification, recovery,
export, session/token lifetimes, email and abuse-control choices remain open.

**Personal-trial clarification:** The owner removed email verification and
specified free APIs for this personal experiment. Email/password authentication
remains. See [ACCOUNT_POLICY.md](ACCOUNT_POLICY.md); verification and SMTP for
verification are no longer blockers. Recovery email is a separate feature.

## 8. Open decisions for the product owner

1. Before account/favorite implementation, resolve account lifecycle policies (verification,
   recovery, deletion/export, retention, token lifetime, mail delivery, and
   registration abuse controls). Architecture, API contract, schema, and
   Phase 3 exit are approved for design.
2. Select a hosting vendor during implementation planning after verifying
   Japan-region availability, pricing, privacy terms, managed PostgreSQL
   backups/PITR support, secrets storage, and monitoring. The design target is
   a same-origin Express service with private PostgreSQL in Japan.
3. The decision to publish the approved local documents to GitHub is deferred;
   no push has been authorized.

Account lifecycle policies remain a blocker before account/favorite
implementation. Vendor selection is deferred to deployment planning against
the targets above. The owner authorized Phase 4 public catalog implementation
on 2026-11-15.

The product owner selected Japan as the launch region and rejected AniList,
Kitsu, and Jikan as candidates on 2026-11-14. The owner approved Wikidata as
the metadata source and approved the Phase 2 exit; its limitations are recorded
in `API_VERIFICATION_REPORT.md`. On 2026-11-15 the owner selected PostgreSQL,
email/password + Argon2id + server-side sessions, no catalog cache, REST/JSON,
and requested anime-TV/anime-film records with genre/year filters. The owner
approved the Phase 3 design package and exit, then separately authorized Phase
4 public catalog implementation on 2026-11-15.

## 9. Phase 1 acceptance criteria

- The product objective, scope boundaries, constraints, and known dependencies
  are documented.
- The requirements distinguish confirmed instructions from unresolved product
  decisions.
- No API, database, video source, or architecture choice is represented as
  verified or approved without evidence and approval.
- The product owner reviewed and approved the MVP choices and Phase 1 exit on
  2026-11-14, and separately authorized the transition to Phase 2.
- Deferred region/browser details remain explicit and must be resolved before
  any decision that depends on them.

## Owner clarification ? 2026-11-15

The owner specified permanent account lifetime and authorized continuing Phase 4 through acceptance preparation. The owner subsequently clarified: accounts have no fixed end date, users may delete their accounts at any time, and accounts inactive for one week must be deleted. This supersedes the initial no-inactivity-deletion interpretation. The activity definition and proposed last_active_at schema addition await approval; no automatic deletion job is enabled. This does not define session/reset-token expiry. Email verification, recovery, export, session/token lifetimes, mail delivery and abuse-control policies remain pending explicit owner clarification. No Phase 5 transition is authorized.
