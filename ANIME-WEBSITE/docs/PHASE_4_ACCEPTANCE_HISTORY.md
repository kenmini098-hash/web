# Phase 4 acceptance preparation

## Owner decision A ? 2026-11-24

The owner approved option A in [PHASE_4_STEP_5_REPORT.md](PHASE_4_STEP_5_REPORT.md): retain current Argon2id/security controls, 120 account requests/minute/IP and 10 authentication requests/15 minutes/IP. Accept the measured shared-IP capacity and concurrent-login p95 limitations for the personal trial only. Original capacity/latency targets are not represented as achieved. Step 5 is complete; unsupported browser/device and deployment/recovery guarantees remain unverified. Step 6 final acceptance and Phase 5 transition are not authorized by this decision.

## Findings and regression update ? 2026-11-24

Step 5 review and regressions are complete: 28/28 full suite and 7/7 real PostgreSQL account checks passed. Capacity findings remain open; the concrete A/B owner decision is in [PHASE_4_STEP_5_REPORT.md](PHASE_4_STEP_5_REPORT.md). Neither the original traffic targets nor Phase 4/5 approval is inferred from the regression results.

## Populated recovery update ? 2026-11-24

Step 4 passed eight integrity checks with three accounts, three sessions and six favorites in isolated PostgreSQL databases. Encrypted archive authentication, restored data/passwords and deletion behavior passed; the personal database was unchanged. See [PHASE_4_STEP_4_REPORT.md](PHASE_4_STEP_4_REPORT.md). Nightly/off-machine retention and production RPO/RTO remain unverified.

## Load/security update ? 2026-11-24

Step 3 executed: security regressions and dependency audit passed; 1,000 local HTTP load requests produced 775 successes and 225 policy-driven 429 responses. Concurrent login p95 was 1,018.73 ms, above the 500 ms target. Shared-IP limits also constrain capacity. See [PHASE_4_STEP_3_REPORT.md](PHASE_4_STEP_3_REPORT.md). Load acceptance and whole-phase approval remain incomplete.

## Live integration update ? 2026-11-24

Step 2 passed 17/17 real-provider checks, including populated browse/search pagination and favorite metadata. See [PHASE_4_STEP_2_REPORT.md](PHASE_4_STEP_2_REPORT.md). This supersedes older statements that no successful current live browse/search evidence exists; latency guarantees and whole-phase acceptance remain pending.

## Acceptance inventory ? 2026-11-24

Current status and superseded historical wording are reconciled in [PHASE_4_STEP_1_CHECKLIST.md](PHASE_4_STEP_1_CHECKLIST.md). Step 1 is complete; later verification and whole-phase owner acceptance remain pending.

## Browser regression update - 2026-11-21

Available Windows browser runs passed 39/39 groups across Chrome, Edge, Firefox and WebKit, including 80 responsive layout checks. A crowded mobile header was fixed and the suite rerun successfully. See [BROWSER_QA_REPORT.md](BROWSER_QA_REPORT.md) and [BROWSER_QA_RESULTS.json](BROWSER_QA_RESULTS.json). Real Safari/iOS/Android and previous-major releases remain untested; whole-phase acceptance is still incomplete.

## Current trial update - 2026-11-21

The owner-approved provider deadline is 20 seconds total, shared across upstream calls and metadata-enriched favorite listing. Regression tests pass 27/27 on the current code. Earlier dated results below remain historical evidence. See [CATALOG_VERIFICATION_REPORT.md](CATALOG_VERIFICATION_REPORT.md) for evidence scope and outstanding acceptance work. Whole-phase acceptance remains incomplete; Phase 5 is not authorized.

Date: 2026-11-16

Status: **Implementation delivered locally; acceptance remains conditional.** This evidence checklist is not final approval or permission to start Phase 5. General catalog browsing still times out against the real provider; that finding must not be hidden by passing account tests.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Public catalog API and Vietnamese UI | Code and real detail probes; general browse still times out | Implemented; browse/latency acceptance unresolved |
| Validation, provider failures and SQL lifecycle | 17 automated tests pass | Passed tested cases |
| Film detail/year mapping | Q21697406/year 2016, 2664 ms | Sample passed; not a catalog-wide guarantee |
| TV detail/year mapping | Q22126305/year 2013, 905 ms | Sample passed; not a filtered-browse guarantee |
| Responsive and keyboard behavior | Account preview widths 320/375/768/1024/1440; registration/login/keyboard deletion | Tested flows passed; full browser matrix pending |
| Accounts, sessions and favorites | Implemented API/UI; actual PostgreSQL HTTP suite 6/6; local port 3105 smoke checks | Passed tested cases; recovery/verification explicitly excluded |
| Security and operational targets | CSRF, cookie flags, session revocation, rate/concurrency limits; encrypted local restore rehearsal | Tested protections passed; load/SLO and populated recovery targets unproven |
| Independent review and owner acceptance | GPT-6 Luna account review found no concrete blocker; operational limitations documented | Account review complete; owner/whole-phase acceptance pending |

## Handoff

- Phase: 4 — implementation and acceptance preparation.
- Responsible agent: ChatGPT; previous provider verification by GPT-6 Astra.
- Completed: catalog/account implementation, local PostgreSQL setup, regression tests, browser account checks, local encrypted restore rehearsal and operations guidance.
- Files: see `PHASE_4_IMPLEMENTATION_REPORT.md` and Git commits.
- Evidence: `backend/test/`, `PHASE_4_PROVIDER_CHECK.md`, implementation report.
- Outstanding: real general-browse timeout, provider-wide end-to-end evidence, full browser/load matrix and production recovery targets. Mail is not needed for this trial.
- Recommendation: review the local trial using `LOCAL_OPERATIONS.md`; resolve or explicitly accept provider limitations before whole-phase acceptance.
- Status: **Local implementation delivered; whole-phase acceptance not complete.**
