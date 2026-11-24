# Phase 4 acceptance preparation

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
