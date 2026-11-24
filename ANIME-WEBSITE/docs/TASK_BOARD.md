# Anime Website - Phase Task Board

## Live integration update ? 2026-11-24

Step 2 passed 17/17 real-provider checks, including populated browse/search pagination and favorite metadata. See [PHASE_4_STEP_2_REPORT.md](PHASE_4_STEP_2_REPORT.md). This supersedes older statements that no successful current live browse/search evidence exists; latency guarantees and whole-phase acceptance remain pending.

## Acceptance inventory ? 2026-11-24

Current status and superseded historical wording are reconciled in [PHASE_4_STEP_1_CHECKLIST.md](PHASE_4_STEP_1_CHECKLIST.md). Step 1 is complete; later verification and whole-phase owner acceptance remain pending.

## Browser regression update - 2026-11-21

Available Windows browser runs passed 39/39 groups across Chrome, Edge, Firefox and WebKit, including 80 responsive layout checks. A crowded mobile header was fixed and the suite rerun successfully. See [BROWSER_QA_REPORT.md](BROWSER_QA_REPORT.md) and [BROWSER_QA_RESULTS.json](BROWSER_QA_RESULTS.json). Real Safari/iOS/Android and previous-major releases remain untested; whole-phase acceptance is still incomplete.

## Current trial update - 2026-11-21

The owner-approved provider deadline is 20 seconds total, shared across upstream calls and metadata-enriched favorite listing. Regression tests pass 27/27 on the current code. Earlier dated results below remain historical evidence. See [CATALOG_VERIFICATION_REPORT.md](CATALOG_VERIFICATION_REPORT.md) for evidence scope and outstanding acceptance work. Whole-phase acceptance remains incomplete; Phase 5 is not authorized.

**Current phase:** Phase 4 - Implementation
**Phase status:** Owner approved the Phase 3 architecture, API contract, and schema, and separately authorized Phase 4 on 2026-11-15. Public catalog implementation is in progress. Account lifecycle decisions block account/favorite work; hosting-vendor selection is deferred to deployment planning.
**Rule:** Tasks for later phases remain unstarted until explicit user approval.

| ID | Task | Status | Evidence / notes |
| --- | --- | --- | --- |
| P1-01 | Inspect the local scaffold and existing project documentation. | Done | Verified 24 zero-byte scaffold files; filenames are clues only. The `.gitinore` and `backend/sever.js` names are preserved and not treated as behavior or technology evidence. |
| P1-02 | Record the product objective, scope, constraints, and requirements from the project brief. | Draft updated | `REQUIREMENTS.md`; Node.js/Express.js and product-owner MVP choices are recorded, with remaining decisions explicit. |
| P1-03 | Identify unresolved product and repository decisions without assuming answers. | Done - draft | `REQUIREMENTS.md`; browser support and publishing updated documents remain undecided. |
| P1-04 | Define the seven phase gates, transition rule, handoff report, and conflict/source-control rules. | Done - draft | `PROJECT_PLAN.md` |
| P1-05 | Obtain product owner review and approval of the updated requirements draft. | Done | Product owner approved the draft and Phase 1 exit on 2026-11-14; open decisions were explicitly deferred. |
| P1-06 | Obtain approval to transition to Phase 2. | Done | Product owner explicitly authorized Phase 2 on 2026-11-14. |
| P2-01 | Verify candidate anime data APIs, response structures, limits, and usage terms. | Done - owner accepted limitations | Japanese title lookup and sample SPARQL fields verified; numerical quotas and production SLO remain unknown, and WDQS is migrating. |
| P2-02 | Check region-specific restrictions and data gaps; distinguish metadata rights from video rights. | Done - owner accepted limitations | No Japan access restriction found; Japanese titles and generic descriptions verified for three anime-TV entities, but catalog and synopsis completeness are not guaranteed. Video/image rights remain separate. |
| P2-03 | Review evidence and present a source recommendation to the product owner. | Done - conditional assessment approved | Wikidata (WDQS + `wbsearchentities`) approved as metadata source; coordinator's evidence and limitations are recorded in `API_VERIFICATION_REPORT.md`. |
| P2-04 | Select/reject a source and approve Phase 2 exit. | Done - approved 2026-11-14 | Product owner approved Wikidata and Phase 2 exit, accepting the reported trade-offs. Phase 3 design work was separately authorized on 2026-11-14. |
| P2-05 | Publish approved project documents to the official GitHub repository. | Deferred | Product owner deferred the publication decision; configured remote advertises `main`. No push was made. |
| P3-01 | Propose frontend/backend boundaries and Wikidata data flow. | Done - architecture approved 2026-11-15 | `ARCHITECTURE.md`; owner approved the same-origin Express modular monolith and Wikidata/PostgreSQL boundaries for design. |
| P3-02 | Define proposed database schema and Wikidata mapping. | Done - schema approved 2026-11-15 | `DATA_MAPPING.md`; owner approved the PostgreSQL schema for design. Account/favorite persistence remains gated on account lifecycle decisions. |
| P3-03 | Draft REST API contract and UI error/loading/empty states. | Done - API contract approved 2026-11-15 | `API_CONTRACT.md`; owner approved the current contract and filter behavior for design. |
| P3-04 | Review consistency across requirements, architecture, contract, and mapping. | Done - filter/operational targets approved | Filter/date semantics and browser, load, latency, availability, and backup targets align across design documents; owner approved these targets on 2026-11-15. `API_VERIFICATION_REPORT.md` records upstream evidence and limits. |
| P3-05 | Obtain owner approval of architecture, contract, schema, and Phase 3 exit. | Done - Phase 3 exit approved 2026-11-15 | `PHASE_3_ACCEPTANCE_REPORT.md` records owner approval. The owner separately authorized Phase 4 on 2026-11-15. |
| P4-01 | Implement public catalog browse/search/filter/detail API and Wikidata adapter. | Implemented locally; review pending | `backend/sever.js`, `backend/wikidata.js`; five automated tests pass. Live film/year regression returns the expected entity; latency and remaining live flows are unresolved. |
| P4-02 | Implement responsive Vietnamese catalog UI and API integration. | Implemented locally; review pending | `frontend/`; includes search, filters, pagination, details, and loading/empty/error states. Mobile 390px timeout/retry view has no horizontal overflow or console entries; successful end-to-end and keyboard checks remain. |
| P4-03 | Implement accounts, favorites, and PostgreSQL persistence. | Implemented and locally tested | API/UI and real PostgreSQL account suite pass. Registration/login, favorites, password change, export/deletion and cleanup implemented; verification/recovery excluded. See latest implementation report. |
| P4-04 | Verify provider integration against current upstream behavior and terms. | Partial; not accepted | `PHASE_4_PROVIDER_CHECK.md` records three live probes and source findings; implementation report records one successful post-fix film/year probe. Latency, TV regression, migration, and load limits remain open. |
| P4-05 | Review Phase 4 evidence and obtain owner acceptance. | Conditional review prepared | Independent account review complete; whole-phase acceptance pending because real general browse still times out. See PHASE_4_ACCEPTANCE_REPORT.md. No Phase 5 transition. |

## Phase 1 exit checklist

- [x] Requirements and scope draft prepared and updated with received decisions.
- [x] Unconfirmed decisions explicitly listed.
- [x] Product owner reviewed and approved the updated requirements draft.
- [x] Open decisions were explicitly deferred.
- [x] Product owner approved Phase 1 exit.
- [x] User separately authorizes transition to Phase 2.
- [x] Publication decision deferred; no push made.

## Owner clarification ? 2026-11-15

The owner specified permanent account lifetime and authorized continuing Phase 4 through acceptance preparation. The owner subsequently clarified: accounts have no fixed end date, users may delete their accounts at any time, and accounts inactive for one week must be deleted. This supersedes the initial no-inactivity-deletion interpretation. The activity definition and proposed last_active_at schema addition await approval; no automatic deletion job is enabled. This does not define session/reset-token expiry. Email verification, recovery, export, session/token lifetimes, mail delivery and abuse-control policies remain pending explicit owner clarification. No Phase 5 transition is authorized.
