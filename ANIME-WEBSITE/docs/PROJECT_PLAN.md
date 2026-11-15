# Anime Website - Gated Project Plan

**Status:** Phase 1 and Phase 2 exits were approved on 2026-11-14. The owner
approved the Phase 3 architecture, API contract, schema, and Phase 3 exit on
2026-11-15, then authorized Phase 4 on 2026-11-15. The public catalog slice is
in progress; Phases 5-7 remain gated.

## Delivery and approval rules

- Each phase has its own task list and acceptance criteria below.
- The owner of a task reports its work, changed files, test evidence, sources,
  issues, remaining work, and status using the user's handoff format.
- ChatGPT checks scope, architecture, consistency, and the phase criteria,
  then presents the evidence to the user.
- Do not start a later phase until the user explicitly approves the current
  phase exit and the transition. A phase plan is not authorization to execute
  its tasks.
- If a phase does not meet its criteria, keep the project in that phase and
  assign corrective work.
- Architecture and scope changes require ChatGPT review and user approval.
- Do not claim completion without the relevant deliverable and evidence.

## Roles

- **User / product owner:** Sets direction, resolves product decisions, and
  approves phase exits and release.
- **ChatGPT / project manager:** Coordinates the seven phases, maintains scope
  and cross-component consistency, reviews architecture and evidence, tracks
  issues, and presents acceptance decisions to the user.
- **Owner-designated ChatGPT API agent:** Verifies anime API and data claims
  against primary documentation and usage terms; reports evidence, gaps, and
  risks. The owner designated GPT-5.6 Terra for this work. The Project Manager
  reviews the report independently and does not duplicate assigned API research.
- **GitHub Copilot / implementation:** Designs the approved UI and implements
  approved frontend, backend, database, and integration work; reports code and
  test evidence. It does not approve its own work.

## Source control, safety, and change control

- GitHub is the authoritative project source. Every agent reads the latest
  approved project documents before starting assigned work.
- Do not delete or overwrite another agent's work without coordination. Use a
  separate branch for large or independent tasks and record every source-code
  change in Git commits.
- Do not commit API keys, passwords, or other credentials. Update technical
  documents when approved implementation changes affect them.
- Do not use fabricated production data, unverified APIs, unauthorized video
  sources, or attempts to bypass access controls.
- Keep an approved API contract and database schema consistent across the
  frontend, backend, and data integration. Changes require review and approval.
- Do not release with unresolved Critical or High security findings.

## Issue, conflict, and handoff procedure

- An agent reporting a conflict or defect provides the reason, technical or
  documentary evidence, impact, and a proposed resolution. Do not silently
  guess or change the system to resolve a disagreement.
- ChatGPT compares options and checks cross-component impact. Changes to scope
  or architecture are presented to the user for a decision.
- Apply this decision priority: accuracy, security, operability,
  maintainability, performance, then user experience.
- Each agent's phase report includes: phase, agent, assigned task, completed
  work, changed files, test results, evidence/sources, issues, remaining work,
  recommendation, and status (complete / incomplete / awaiting approval).

## Phase 1 - Requirements and scope (completed)

### Tasks

1. Record the user's explicit product and governance requirements.
2. Inspect the project scaffold and distinguish file-name clues from confirmed
   behavior or technology choices.
3. List user journeys, release features, constraints, and open decisions.
4. Confirm the official GitHub repository and the MVP's language, user-facing
   features, and video approach with the product owner.
5. Present the requirements and phase checklist for user review.

### Acceptance criteria

- `REQUIREMENTS.md` separates confirmed requirements, assumptions, and open
  decisions.
- Product scope includes the user's requirements for API and database
  consistency, legal video sources, real production data, security, and release
  readiness.
- No framework, API provider, database product, API style, or video source is
  presented as selected without evidence and approval.
- The product owner reviews the draft, resolves or explicitly defers open
  decisions, and approves the Phase 1 exit.
- The user separately authorizes transition to Phase 2.

## Phase 2 - API and data verification (exit approved)

### Tasks

1. The ChatGPT research agent identifies candidate anime metadata sources
   using official provider documentation and terms.
2. For each candidate, verify endpoints, HTTP methods, request parameters,
   JSON response shapes, required credentials, pagination, quotas, and rate
   limits.
3. Assess data completeness, freshness, missing fields, duplicate records,
   attribution rules, caching/storage rights, and commercial-use restrictions.
4. Investigate video availability separately; verify rights and provider terms
   before recommending any playback integration.
5. The ChatGPT research agent submits a sourced comparison and recommendation;
   the Project Manager checks that claims map to the actual documentation and
   approved requirements.
6. If the owner rejects candidates or sets a region-specific requirement,
   verify alternatives against that decision before recommending a source.
7. The owner prefers a no-cost API, without a vendor-specific preference.
   Verify that data-use terms, Japanese-language coverage, and quotas fit the
   approved MVP; a free endpoint alone is not sufficient evidence.

### Acceptance criteria

- The report links the primary documentation and applicable terms for each
  evaluated source.
- Endpoint and JSON examples are supported by documentation or clearly marked
  as observed test evidence; unknowns and limits are explicit.
- The report distinguishes metadata access from rights to stream video.
- The user selects or rejects the proposed data source and approves Phase 2
  exit and transition to Phase 3.

## Phase 3 - Architecture and design (exit approved 2026-11-15)

### Tasks

1. ChatGPT proposes frontend/backend boundaries and a data flow based on the
   approved requirements and verified source constraints.
2. Define the database schema and data mapping for the approved user journeys.
3. Draft the API contract and error/loading/empty-state behavior.
4. Specify responsive layouts, navigation, accessibility expectations, and
   security boundaries without adding unapproved product features.
5. Document deployment assumptions, secrets handling, and backup/restore
   requirements.
6. Review consistency across requirements, API contract, schema, and UI.

### Acceptance criteria

- `ARCHITECTURE.md`, `API_CONTRACT.md`, and `DATA_MAPPING.md` agree with each
  other and with the approved requirements and verified API evidence.
- Schema, API endpoints, data fields, and ownership of each field are explicit.
- Security, error handling, responsive behavior, and legal data/video
  constraints are addressed.
- Operational targets are explicit for supported browsers/viewports, MVP
  traffic and latency, upstream timeout handling, availability, logging, and
  backup/recovery; external provider limits are not presented as guarantees.
- ChatGPT submits the architecture recommendation and tradeoffs; the user
  explicitly approves the architecture, contract, schema, and Phase 3 exit.
- Phase 3 exit does not authorize Phase 4; the user must separately approve
  transition before any implementation task begins.

The owner approved the current architecture, API contract, and schema and
explicitly approved Phase 3 exit on 2026-11-15. Account lifecycle decisions
(verification, recovery, deletion/export, retention, token lifetime, mail and
registration abuse controls) and hosting vendor selection remain blockers
that must be resolved before account and favorite implementation. The owner
separately authorized Phase 4 on 2026-11-15. Hosting-vendor selection is
deferred to implementation/deployment planning and does not block the public
catalog slice.

## Phase 4 - Implementation (active; public catalog slice)

### Tasks

1. Copilot implements only the approved design and task scope.
2. Build the agreed frontend pages and responsive states.
3. Build backend and database integration to the approved schema and contract.
4. Add configuration and secret handling without committing credentials.
5. Update technical documents as implementation decisions are completed.
6. Record changes in the approved Git branch and provide implementation notes.

Current authorized slice: public catalog browse, Japanese-title search,
type/genre/year filters, and anime details. Account flows, favorites, their
database persistence, and deployment-vendor selection are not part of this
increment. Resolve account lifecycle decisions before implementing account or
favorite flows. A live provider check is required before accepting the
integration for release.

### Acceptance criteria

- Implemented behavior matches approved requirements, architecture, API
  contract, and schema; deviations are reported for review before adoption.
- No secrets or fabricated production catalog records are introduced.
- Source changes are committed on a reviewable Git branch. Publishing to the
  official GitHub repository remains subject to the owner's deferred publish
  decision.
- Copilot reports changed files, test evidence, defects, and remaining work;
  ChatGPT reviews before Phase 4 exit.
- The user approves Phase 4 exit and separately authorizes Phase 5.

## Phase 5 - Integration and testing (not started)

### Tasks

1. Copilot integrates frontend, backend, database, and approved anime API.
2. Verify agreed user journeys and loading, empty, timeout, and error states.
3. Check responsive behavior and API/schema consistency.
4. Measure performance against user-approved targets and fix in-scope defects.
5. Report reproducible test steps, results, and unresolved issues.

### Acceptance criteria

- Integration tests cover the approved end-to-end journeys and real API/data
  connection; no production mock data is presented as real.
- Test evidence identifies environment, commands or steps, and outcomes.
- No unresolved integration defect prevents an approved user journey.
- ChatGPT reviews evidence and the user approves Phase 5 exit and transition.

## Phase 6 - Security and acceptance (not started)

### Tasks

1. Review authentication (if approved), authorization, input validation, secret
   exposure, dependency risks, privacy, and data retention against scope.
2. Check API and video-source compliance against verified terms.
3. Run the user-approved security and acceptance checks; record findings with
   severity and evidence.
4. Copilot fixes assigned code findings; an agent does not self-approve its
   complete work.
5. ChatGPT reviews fixes and presents the acceptance report to the user.

### Acceptance criteria

- No unresolved Critical or High security finding remains.
- All agreed acceptance criteria have evidence, or exceptions are explicitly
  approved by the user with their impact documented.
- Data/API/video usage follows the verified and approved terms.
- The user approves Phase 6 exit and separately authorizes Phase 7.

## Phase 7 - Deployment and handoff (not started)

### Tasks

1. Prepare the deployment using approved infrastructure and release settings.
2. Verify production configuration and secret handling without exposing
   credentials.
3. Document deployment, monitoring, backup, restore, and rollback procedures.
4. Demonstrate backup/restore using the approved database and capture evidence.
5. Present release status, known limitations, and handoff materials to the user.

### Acceptance criteria

- Deployment instructions are reproducible and match the approved system.
- Backup and restore procedures have been exercised and documented.
- No unresolved Critical or High security finding remains at release.
- The user gives final release approval after reviewing the evidence.

## Current phase

Phase 1 exit and transition to Phase 2 were authorized on 2026-11-14. The owner
selected Japan, requested Japanese-language data, rejected AniList, Kitsu, and
Jikan, paused MAL follow-up, and prefers a no-cost API without a
vendor-specific preference. On 2026-11-14 the owner approved Wikidata
(WDQS plus the `wbsearchentities` Action API) as the metadata source and
approved the Phase 2 exit, accepting the reported coverage and operational
limitations. The user separately authorized Phase 3 design work on
2026-11-14. These approvals do not grant video or third-party image rights.
The owner separately authorized Phase 4 public catalog implementation on
2026-11-15; account/favorite work remains blocked on account lifecycle
decisions. The official repository is
`https://github.com/kenmini098-hash/web.git`; the configured local remote
matches this URL and advertises a `main` branch. Local documentation has
uncommitted edits and has not been pushed. Phases 5-7 remain inactive until
their required approvals are given.
