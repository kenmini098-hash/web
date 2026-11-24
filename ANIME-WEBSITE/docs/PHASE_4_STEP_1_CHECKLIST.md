# Step 1 — Acceptance inventory

Date: 2026-11-24. Baseline: `5d50d26`.

This is a document/code evidence audit, not a new execution of tests. Previous test results retain their original dates. Passing a sampled test does not establish whole-phase acceptance.

| Requirement / owner decision | Evidence inspected | Current assessment | Next verification |
| --- | --- | --- | --- |
| Wikidata metadata only; Japanese titles; Vietnamese UI; no video/cache | `backend/wikidata.js`, `frontend/`, `API_CONTRACT.md` | Implemented; source-wide completeness unproven | Step 2 live matrix |
| Browse/search, TV/film, genre/year, pagination, detail | `CATALOG_VERIFICATION_REPORT.md`, `CATALOG_CURRENT_PROBE.json`, adapter tests | Partial live evidence: Nov 21 browse 20 items/10,229 ms and TV detail/442 ms; earlier full matrix belongs to an older revision | Step 2 on current revision, including populated continuation and duplicate/missing data checks |
| Owner-approved total provider deadline 20 seconds | Exported `REQUEST_TIMEOUT_MS`, favorites caller, shared-budget test | Implemented; 27 tests passed Nov 21; original p95/p99 goals unproven | Steps 2–3; retain failures |
| Email/password without verification or password recovery | `ACCOUNT_POLICY.md`, `backend/accounts.js`, account UI | Implemented; excluded features are not blockers | Step 3 security review |
| No fixed account expiry; self deletion; deletion after 168 hours inactivity | `account-lifecycle.js`, server maintenance, policy and lifecycle tests | Implemented/tested in earlier runs; startup/minute cleanup requires running app | Step 3 review inactivity and session boundaries |
| Argon2id, server sessions, CSRF, account/favorite isolation, export, password change | Account code, account tests, `BROWSER_QA_RESULTS.json` | Tested cases passed; no full security acceptance | Step 3 |
| Actual PostgreSQL persistence | Migration/database code and previous real PostgreSQL suite recorded in implementation report | Prior integration evidence available; browser suite used disposable PGlite | Step 4 populated PostgreSQL restore |
| Current/previous Chrome, Edge, Firefox, Safari, iOS Safari, Android Chrome | `BROWSER_QA_REPORT.md`, JSON results | Nov 21: 39/39 groups on installed Chrome/Edge and Playwright Firefox/WebKit; previous releases and real Safari/mobile devices unavailable | Step 5: preserve pending rows; do not call WebKit Safari |
| Responsive widths 320/375/768/1024/1440; keyboard | Browser report and regression script | 80 layout checks passed; mobile header fixed and retested; sampled keyboard/touch flows passed | Step 5 after any UI fix |
| Load/latency/availability targets | `ARCHITECTURE.md`, `REQUIREMENTS.md`, operations limits | Not demonstrated; rate/concurrency limits are per process; provider has no verified SLO | Step 3 bounded local load, no upstream stress |
| Encrypted backup, populated restore, nightly retention/RPO/RTO | `LOCAL_OPERATIONS.md`, backup verification script, implementation report | Local encrypted restore smoke exists; populated recovery and scheduled/off-machine backups unproven | Step 4; deployment scheduling remains deferred |
| No unresolved Critical/High issues; independent review | Prior account review recorded in acceptance report | Account review only; no whole-phase independent approval | Steps 3/5/6 |
| Owner acceptance and explicit phase transition | Project gate rules | Pending; no Phase 5 authorization | Step 6 |

## Documentation discrepancies found

Older paragraphs in `REQUIREMENTS.md`, `TASK_BOARD.md` and the acceptance report still mention pending lifecycle decisions, five/17 tests and general browsing failure as the only current result. Later amendments supersede them. Read the dated current updates, `ACCOUNT_POLICY.md` and this inventory for current status; keep historical measurements labelled by date/revision. No new architectural approval is inferred from this audit.

## Handoff

- Phase: 4, remaining-work step 1 — acceptance inventory.
- Responsible agent: ChatGPT.
- Assigned task: compare approved requirements, implementation and existing evidence.
- Completed: acceptance matrix, evidence dates/scope, document discrepancies and remaining checks identified.
- Files created/edited: this checklist; current-status links in requirements/task board/acceptance report.
- Test result: no runtime tests executed in this audit; prior 27/27 automated and 39/39 browser groups are dated Nov 21.
- References: repository files linked/named above and owner decisions in the conversation.
- Issues: incomplete current-revision live matrix; unavailable browser/device rows; load/security and populated recovery gaps; stale historical wording.
- Remaining: steps 2 through 6 listed above.
- Recommendation: use this matrix as the scope for subsequent checks; resolve discrepancies in final consolidated report.
- Status: **Step 1 complete; Phase 4 acceptance incomplete.**
