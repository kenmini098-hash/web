# Phase 4 Implementation Report - Public Catalog Slice

**Date:** 2026-11-15
**Status:** Account/public-catalog implementation delivered locally; conditional acceptance review. Latest evidence is below. Earlier sections are historical checkpoints, not current feature status.

## Latest evidence — 2026-11-16

- Implemented email/password registration/login/logout, session rotation, password change, JSON export, confirmed reauthenticated deletion, favorites add/remove/list with signed user-bound pagination, and Vietnamese account UI. No email verification or recovery routes.
- Added Argon2id, CSRF enforcement, secure-cookie defaults, loopback-only HTTP option, body validation/limits, per-IP authentication rate limits, account response no-store, provider concurrency cap and streamed response-size limit.
- Account activity/deletion is wired to authenticated requests and a startup/minute maintenance loop. Thirty-day authenticated sessions, one-hour anonymous sessions, twelve-character minimum passwords are the personal-trial implementation defaults.
- Full automated suite: 17/17 passed. Separate actual PostgreSQL account HTTP run: 6/6 passed in a temporary schema. Includes cross-user isolation, CSRF, cookie flags, rate limits, signed pagination, password/session revocation and reauthentication deletion.
- Provisioned a workspace-local PostgreSQL 18.7 cluster on 127.0.0.1:55434 and migrated a non-superuser application database. Credentials/keys/data are ignored by Git. `/healthz`, `/account.html`, `/api/v1/csrf` on port 3105 returned HTTP 200.
- Browser on the disposable SQL preview: registration without verification, login and two-step deletion passed. Reauthentication/deletion were exercised with keyboard Enter. Widths 320/375/768/1024/1440 had no horizontal overflow; console contained no entries. This is not the full cross-browser matrix.
- Real provider detail probes returned Q21697406/year 2016 in 2664 ms and Q22126305/year 2013 in 905 ms. General browse still hit the 8-second timeout; no full provider-integration or latency acceptance is claimed.
- Encrypted local backup successfully restored into an isolated database and migration/table access verified. No nightly/off-machine schedule was installed; populated-data recovery and load targets still need validation.
- GPT-6 Luna independently reviewed account backend/lifecycle/UI read-only and found no concrete blocker. It flagged process-local rate limits and runtime-dependent cleanup as operational limitations. It did not run tests or approve the whole phase.
- Current files: `backend/accounts.js`, `sever.js`, `wikidata.js`, package files, account/provider tests, local preview/configuration/backup scripts, `frontend/account.html`, account CSS/JS, catalog entry points, configuration examples and operations/policy documents.
- No push, paid service, public deployment or Phase 5 transition. See `PHASE_4_ACCEPTANCE_REPORT.md` and `LOCAL_OPERATIONS.md`.

## Handoff

- **Phase:** 4 - Implementation
- **Agent:** ChatGPT project manager / implementation fallback. A GitHub Copilot connector was not available in this session. The owner-designated ChatGPT API agent (GPT-6 Astra) remains responsible for API verification; this implementation does not replace that review.
- **Assigned task:** Start Phase 4 and implement the approved, public catalog slice: browse, Japanese-title search, type/genre/year filters, and detail view.
- **Completed:** Added an Express JSON API and Wikidata adapter, a responsive Vietnamese catalog UI, runtime configuration examples, and local start instructions. No catalog records are seeded or cached. Detail dates and episode counts remain null unless mapped by a future verified adapter change.
- **Files created or changed:** `.gitignore`, `.env.example`, `README.md`, `backend/package.json`, `backend/package-lock.json`, `backend/sever.js`, `backend/wikidata.js`, `backend/test/wikidata.test.js`, `frontend/index.html`, `frontend/css/main.css`, `frontend/css/components.css`, `frontend/css/responsive.css`, `frontend/js/api.js`, `frontend/js/app.js`.

## Evidence

- `npm test`: five Node.js tests passed after corrections, covering mapping/cursors, date query construction, malformed provider responses, and eleven invalid API queries. Provider fixtures are test-only.
- Local smoke check: `GET /healthz` returned HTTP 200 with `{"status":"ok"}`; `GET /` returned HTTP 200.
- `git diff --check`: no whitespace errors.
- The adapter uses the approved exact TV/film type IDs, Japanese labels, bounded request timeout, validated query inputs, and configured official Wikidata endpoints. See `API_CONTRACT.md`, `DATA_MAPPING.md`, and `API_VERIFICATION_REPORT.md` for the approved design and prior source evidence.

## Issues and remaining work

- Live verification is recorded in `PHASE_4_PROVIDER_CHECK.md`. Post-fix film/year regression returned Q21697406 with year 2016 at 2026-11-15T12:10:53.813Z, HTTP 200, 8048 ms. This direct probe used a 15-second timeout; it exceeds the application's 8-second budget and does not establish production latency or full integration acceptance. TV/year post-fix and browse/search pagination still need live verification.
- Orca browser displayed the real provider-timeout message and retry action. At 390x844, document width equaled viewport width (390px); console had no entries. Successful catalog end-to-end, full keyboard, and wider browser checks remain unverified.
- Accounts, favorites, and PostgreSQL persistence are not implemented. They remain blocked on account lifecycle decisions recorded in `REQUIREMENTS.md`.
- Hosting vendor and deployment configuration remain deferred to deployment planning. No push to GitHub was made.
- Provider concurrency/rate shaping and performance under the approved load profile still require API-agent input and later integration testing.

## Recommendation

Keep Phase 4 active. Review the local code and await the designated API-agent verification before treating provider integration as accepted. Complete the outstanding UI and integration checks before requesting Phase 4 exit. Do not start Phase 5 without separate owner approval.

**Result:** Public catalog slice implemented locally; review and provider verification pending.

## Approved lifecycle foundation

- Owner approved last_active_at, authenticated activity semantics and seven-day deletion.
- Added versioned PostgreSQL migration for users, sessions, favorites and auth tokens; session-scoped activity/self-deletion helpers; bounded cleanup (100 accounts per run) with row locks and cascade deletion.
- Added `pg` for production connectivity and `@electric-sql/pglite` only for tests. Production remains PostgreSQL.
- `npm test`: 10 tests pass, including three SQL lifecycle subtests. Covers repeatable migration, inactivity cutoff, cascades, confirmation, fresh reauthentication, and expired/unverified/anonymous sessions. Package installation reported zero vulnerabilities.
- Files: `backend/database.js`, `backend/account-lifecycle.js`, `backend/migrations/001_accounts.sql`, `backend/scripts/accounts.js`, `backend/test/account-lifecycle.test.js`, package files, `.env.example`, README and specification/status documents.
- No real database connection, scheduled cleanup or account HTTP/UI integration has been verified. Multi-client race behavior and backup restoration remain untested.
- References: [node-postgres transactions](https://node-postgres.com/features/transactions), [parameterized queries](https://node-postgres.com/features/queries), [PGlite test engine](https://pglite.dev/docs/).
- Status: database foundation implemented locally; Phase 4 is not complete.

## Corrective implementation, 2026-11-15

- Bound TV/film classes inside date UNION branches, excluded deprecated date statements and media classes from genres, and rejected malformed upstream rows.
- Rejected empty/invalid query parameters; provider requests do not follow redirects outside the configured endpoint.
- Cancelled stale detail requests and guarded stale list/facet updates; pagination reuses submitted criteria.
- Changed files: `backend/sever.js`, `backend/wikidata.js`, `backend/test/api.test.js`, `backend/test/wikidata.test.js`, `frontend/js/app.js`, this report, `TASK_BOARD.md`, and `PHASE_4_PROVIDER_CHECK.md`.
- No new dependency, database change, push, deployment, or Phase 5 transition. Frontend race fixes have code review but no automated browser regression yet.

## Password recovery scope update

- Owner explicitly excluded password recovery. No reset endpoints, reset emails
  or forgot-password UI will be implemented for this trial. SMTP and reset-token
  lifetime decisions are no longer blockers.
- Updated policy, contract, architecture, mapping, requirements, task board and
  README. Existing versioned schema remains intact; reset-token table is unused.
- Documentation-only change; existing runtime has no password recovery routes.
  No tests rerun because runtime behavior and schema were not changed.

## Personal-trial email policy update

- Owner removed email verification; registration/login will use email/password
  without confirmation mail. Free services only; no paid service selected.
- Removed verification gates from activity and voluntary-deletion SQL helpers.
  Session validity, inactivity deadline, explicit confirmation and fresh password
  reauthentication checks remain. Verification state is not fabricated.
- Updated SQL regression to allow a null verification timestamp while still
  rejecting expired/anonymous sessions. Account API/UI remains unimplemented.
- `ACCOUNT_POLICY.md` is the current policy overriding older verification gates.

## Follow-up validation

- Six automated tests pass, including rate-limit Retry-After preservation, timeout mapping, upstream HTTP errors, malformed JSON and null JSON rejection.
- The post-fix Q22126305 TV/year=2013 direct live query timed out at the configured 8-second deadline on 2026-11-15; no successful TV regression is claimed.
- Neither psql nor docker was found on PATH in this workspace session. This does not prove a remote PostgreSQL service is absent. Database/mail connection details are pending.
- Permanent account lifetime is recorded; remaining policy questions are pending. Phase 4 is not yet ready for final acceptance.
