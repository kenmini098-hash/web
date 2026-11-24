# Phase 4 implementation handoff

Date: 2026-11-24. Evidence baseline: `8f10a4c`.

**Step 6 handoff prepared; owner acceptance pending.** This report is not self-approval, release approval or permission to start Phase 5. Earlier dated updates and failures are preserved in [PHASE_4_ACCEPTANCE_HISTORY.md](PHASE_4_ACCEPTANCE_HISTORY.md).

## Delivered scope

Same-origin Express application, Vietnamese frontend, PostgreSQL accounts/favorites and real Wikidata metadata. Catalog supports Japanese-title search, browse, TV/film, genre/year filters, pagination and details. Accounts support email/password registration/login, sessions, password change, favorites, JSON export and confirmed self-deletion after recent reauthentication.

Owner policy: no email verification or password recovery; no fixed account lifetime; deletion after 168 hours without successful login/authenticated API use. Provider requests share a 20-second trial deadline. No paid API, catalog cache or video source is integrated. Fixtures remain confined to QA harnesses/disposable databases.

## Evidence matrix

| Area | Evidence/date | Assessment |
| --- | --- | --- |
| Scope inventory | [Step 1](PHASE_4_STEP_1_CHECKLIST.md), Nov 24 | Requirements, decisions and gaps recorded |
| Live provider | [Step 2](PHASE_4_STEP_2_REPORT.md), Nov 24 | 17/17 checks passed, including populated browse/search pagination, filters/details and favorite metadata |
| Regression | [Step 5](PHASE_4_STEP_5_REPORT.md), Nov 24 | 28/28 full suite; 7/7 real PostgreSQL account suite |
| Browser/UI | [Browser report](BROWSER_QA_REPORT.md), Nov 21 | 39/39 groups, 80 layout checks across Chrome/Edge/Firefox/WebKit; mobile header fixed. Exact builds/fixture boundaries documented |
| Load/security | [Step 3](PHASE_4_STEP_3_REPORT.md), Nov 24 | 1,000 requests: 775 success, 225 rate-limited, no 5xx. Login burst p95 1,018.73 ms; tested protections passed; production dependency audit: zero known vulnerabilities |
| Populated recovery | [Step 4](PHASE_4_STEP_4_REPORT.md), Nov 24 | Eight checks passed; 3 users/3 sessions/6 favorites restored, source unchanged, temporary databases removed |
| Finding disposition | [Step 5/decision A](PHASE_4_STEP_5_REPORT.md), Nov 24 | Trial capacity exceptions approved; limits/Argon2id unchanged |

These suite counts overlap in coverage and are not one combined acceptance score. Browser evidence predates documentation/QA-only changes; no new browser execution is claimed by this handoff.

## Approved exceptions

Owner selected A on Nov 24: retain 120 account requests/minute/IP, 10 authentication requests/15 minutes/IP and Argon2id protection. Accept measured shared-IP throttling and concurrent-login latency for the personal trial. Original 5/10 RPS capacity and login p95 <=500 ms goals are not marked achieved. Option A does not waive unrelated requirements.

The approved 20-second provider budget is a trial exception. Real successes and historical timeouts coexist; source completeness and a Wikidata SLO are not guaranteed.

## Outstanding items

1. **Independent review:** the historical report records earlier independent account review. The entire latest package has not received independent approval. Root implementation/review and the earlier Copilot-unavailable fallback are disclosed; the separate Copilot/ChatGPT review chain is not claimed complete.
2. **Device/browser support:** Safari/macOS, iOS Safari, Android Chrome and previous major releases remain untested. Windows WebKit is not Safari certification.
3. **Recovery operations:** no nightly/off-machine schedule, seven restore points or production RPO/RTO evidence. Populated restoration passed only for the local fixture.
4. **Deployment:** hosting, HTTPS/proxy validation, shared multi-instance counters, 30-day redacted logging, monthly availability and frontend web-vital measurements remain pending.
5. **External sources:** dated source research remains applicable evidence; this handoff is not a fresh terms review, catalog-wide factual audit or rights grant. No video source is shipped.
6. **Repository:** commits are local on `main`; no push or PR was performed. No separate feature-branch/reviewer approval is claimed. Publication remains deferred by the owner.

No concrete unresolved High/Critical defect was identified in the tested scope. This is not independent whole-system approval or certification of an untested deployment. The outstanding items are not silently waived by option A.

## Operations and handoff

Use [LOCAL_OPERATIONS.md](LOCAL_OPERATIONS.md) to start/check the trial. Policies are in [ACCOUNT_POLICY.md](ACCOUNT_POLICY.md); contracts/mapping in [API_CONTRACT.md](API_CONTRACT.md) and [DATA_MAPPING.md](DATA_MAPPING.md). Step reports link raw evidence/commands. Secrets, keys and encrypted local artifacts remain under ignored `.local/`.

- Phase: 4; step 6 — consolidated implementation handoff.
- Responsible agent: ChatGPT.
- Task: consolidate evidence, approved exceptions and outstanding work for owner review.
- Completed: report/evidence index, archived historical acceptance notes, current task/phase status updates.
- Files: this report, acceptance history, task board and project plan.
- Tests: previous dated evidence summarized above; this document-only step runs no new runtime tests.
- Issues/remaining: owner disposition and outstanding independent/device/operational checks above.
- Recommendation: review acceptance of the **local personal-trial implementation**, explicitly carrying forward the remaining items. This is not approval to deploy or publish.
- Status: **Step 6 handoff complete; Phase 4 exit awaits owner approval. Phase 5 requires separate authorization.**
